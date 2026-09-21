"""Async Mongo-style compatibility layer backed by PostgreSQL JSONB."""
from __future__ import annotations
import asyncio, json, os, re, uuid
from copy import deepcopy
from datetime import date, datetime
from typing import Any, Optional
import asyncpg

def _j(v):
    if isinstance(v,(datetime,date)): return v.isoformat()
    if isinstance(v,dict): return {k:_j(x) for k,x in v.items()}
    if isinstance(v,(list,tuple)): return [_j(x) for x in v]
    return v

def _get(doc,path):
    cur=doc
    for p in path.split("."):
        if not isinstance(cur,dict) or p not in cur: return None
        cur=cur[p]
    return cur

def _eq(v,e):
    return e in v if isinstance(v,list) and not isinstance(e,list) else v==e

def _cmp(v,e,op):
    if v is None: return False
    try:
        return {"$gt":v>e,"$gte":v>=e,"$lt":v<e,"$lte":v<=e}[op]
    except TypeError:
        a,b=str(v),str(e)
        return {"$gt":a>b,"$gte":a>=b,"$lt":a<b,"$lte":a<=b}[op]

def _mv(v,c):
    if not isinstance(c,dict) or not any(str(k).startswith("$") for k in c): return _eq(v,c)
    opts=str(c.get("$options",""))
    for op,e in c.items():
        if op=="$options": continue
        if op=="$in":
            if isinstance(v,list):
                if not any(x in e for x in v): return False
            elif v not in e: return False
        elif op=="$ne":
            if _eq(v,e): return False
        elif op in {"$gt","$gte","$lt","$lte"}:
            if not _cmp(v,e,op): return False
        elif op=="$regex":
            if v is None or re.search(str(e),str(v),re.I if "i" in opts else 0) is None: return False
        else: return False
    return True

def _match(doc,q):
    if not q: return True
    for k,c in q.items():
        if k=="$or":
            if not any(_match(doc,x) for x in c): return False
        elif not k.startswith("$") and not _mv(_get(doc,k),c): return False
    return True

def _proj(doc,p):
    if doc is None: return None
    out=deepcopy(doc)
    if not p: return out
    inc=[k for k,v in p.items() if v and k!="_id"]
    if inc: return {k:_get(out,k) for k in inc if _get(out,k) is not None}
    for k,v in p.items():
        if not v: out.pop(k,None)
    return out

def _sk(v):
    if v is None: return (1,"")
    return (0,v if isinstance(v,(int,float)) else str(v))

def _set(doc,path,val):
    parts=path.split("."); cur=doc
    for p in parts[:-1]:
        if not isinstance(cur.get(p),dict): cur[p]={}
        cur=cur[p]
    cur[parts[-1]]=_j(val)

def _unset(doc,path):
    parts=path.split("."); cur=doc
    for p in parts[:-1]:
        cur=cur.get(p)
        if not isinstance(cur,dict): return
    cur.pop(parts[-1],None)

def _apply(doc,u):
    out=deepcopy(doc)
    for op,vals in u.items():
        if op=="$set":
            for k,v in vals.items(): _set(out,k,v)
        elif op=="$unset":
            for k in vals: _unset(out,k)
        elif op=="$inc":
            for k,v in vals.items(): _set(out,k,(_get(out,k) or 0)+v)
        elif op in {"$push","$addToSet"}:
            for k,v in vals.items():
                arr=_get(out,k)
                if not isinstance(arr,list): arr=[]
                arr=list(arr)
                if op=="$push" or v not in arr: arr.append(_j(v))
                _set(out,k,arr)
        elif not op.startswith("$"): _set(out,op,vals)
    return out

class _R:
    def __init__(self,modified_count=0,deleted_count=0):
        self.modified_count=modified_count; self.deleted_count=deleted_count

class Cursor:
    def __init__(self,c,q,p):
        self.c=c; self.q=q or {}; self.p=p; self.s=[]; self.n=None; self.items=None; self.i=0
    def sort(self,key,direction=None):
        self.s=[(str(k),int(d)) for k,d in key] if isinstance(key,list) else [(str(key),int(direction or 1))]
        return self
    def limit(self,n): self.n=int(n); return self
    async def _prep(self):
        if self.items is not None: return
        a=[d for d in await self.c._all() if _match(d,self.q)]
        for k,d in reversed(self.s): a.sort(key=lambda x:_sk(_get(x,k)),reverse=d<0)
        if self.n is not None: a=a[:self.n]
        self.items=[_proj(x,self.p) for x in a]
    def __aiter__(self): return self
    async def __anext__(self):
        await self._prep()
        if self.i>=len(self.items): raise StopAsyncIteration
        x=self.items[self.i]; self.i+=1; return x

class PgDocumentDB:
    def __init__(self,dsn=None):
        self.dsn=dsn or os.environ["DATABASE_URL"]; self.pool=None
        self._ready=asyncio.Lock(); self._write=asyncio.Lock()
    async def ensure_ready(self):
        if self.pool is not None: return
        async with self._ready:
            if self.pool is not None: return
            self.pool=await asyncpg.create_pool(self.dsn,min_size=1,max_size=5)
            async with self.pool.acquire() as con:
                await con.execute("""CREATE TABLE IF NOT EXISTS oka_documents(
                    collection TEXT NOT NULL, doc_id TEXT NOT NULL, data JSONB NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    PRIMARY KEY(collection,doc_id))""")
                await con.execute("CREATE INDEX IF NOT EXISTS oka_documents_collection_idx ON oka_documents(collection)")
    def __getattr__(self,n):
        if n.startswith("_"): raise AttributeError(n)
        return Collection(self,n)
    def __getitem__(self,n): return Collection(self,n)
    async def close(self):
        if self.pool is not None: await self.pool.close(); self.pool=None

class Collection:
    def __init__(self,db,name): self.db=db; self.name=name
    def _id(self,d): return str(d.get("id") or d.get("key") or uuid.uuid4())
    async def _all(self):
        await self.db.ensure_ready()
        rows=await self.db.pool.fetch("SELECT data FROM oka_documents WHERE collection=$1",self.name)
        out=[]
        for r in rows:
            x=r["data"]; x=json.loads(x) if isinstance(x,str) else x; out.append(dict(x))
        return out
    async def _save(self,d,did=None):
        await self.db.ensure_ready(); clean=_j(deepcopy(d)); did=str(did or self._id(clean))
        await self.db.pool.execute("""INSERT INTO oka_documents(collection,doc_id,data,updated_at)
            VALUES($1,$2,$3::jsonb,now()) ON CONFLICT(collection,doc_id)
            DO UPDATE SET data=EXCLUDED.data,updated_at=now()""",self.name,did,json.dumps(clean,ensure_ascii=False))
    async def insert_one(self,d):
        async with self.db._write: await self._save(d)
        return _R(1)
    async def insert_many(self,docs):
        async with self.db._write:
            for d in docs: await self._save(d)
        return _R(len(docs))
    def find(self,q=None,p=None): return Cursor(self,q or {},p)
    async def find_one(self,q=None,p=None,sort=None):
        a=[d for d in await self._all() if _match(d,q or {})]
        if sort:
            for k,d in reversed(sort): a.sort(key=lambda x:_sk(_get(x,k)),reverse=int(d)<0)
        return _proj(a[0],p) if a else None
    async def count_documents(self,q=None): return sum(1 for d in await self._all() if _match(d,q or {}))
    async def update_one(self,q,u,upsert=False):
        async with self.db._write:
            a=await self._all(); t=next((d for d in a if _match(d,q)),None)
            if t is None:
                if not upsert: return _R(0)
                t={k:_j(v) for k,v in q.items() if not k.startswith("$") and not isinstance(v,dict)}
            await self._save(_apply(t,u),self._id(t)); return _R(1)
    async def update_many(self,q,u):
        async with self.db._write:
            a=[d for d in await self._all() if _match(d,q)]
            for d in a: await self._save(_apply(d,u),self._id(d))
            return _R(len(a))
    async def delete_many(self,q):
        async with self.db._write:
            a=[d for d in await self._all() if _match(d,q)]
            for d in a: await self.db.pool.execute("DELETE FROM oka_documents WHERE collection=$1 AND doc_id=$2",self.name,self._id(d))
            return _R(deleted_count=len(a))
    async def delete_one(self,q):
        async with self.db._write:
            d=next((x for x in await self._all() if _match(x,q)),None)
            if not d: return _R(deleted_count=0)
            await self.db.pool.execute("DELETE FROM oka_documents WHERE collection=$1 AND doc_id=$2",self.name,self._id(d))
            return _R(deleted_count=1)
    async def find_one_and_update(self,q,u,upsert=False,return_document=None):
        async with self.db._write:
            a=await self._all(); t=next((d for d in a if _match(d,q)),None)
            if t is None:
                if not upsert: return None
                t={k:_j(v) for k,v in q.items() if not k.startswith("$") and not isinstance(v,dict)}
            x=_apply(t,u); await self._save(x,self._id(t)); return deepcopy(x)
