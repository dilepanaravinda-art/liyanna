import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {create,act} from 'react-test-renderer';
import LiyannaPreview from '../../components/LiyannaPreview.tsx';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const data={schemaVersion:'liyanna.invoice-snapshot.v1',postingAuthorized:false,businessId:'949c7003-ec60-432d-b61b-98cf7d763ec6',invoices:[]};
const reviewed={mode:'review-only',postingAuthorized:false,mappingPersisted:false,documentCount:0,documents:[]};
async function upload(tree:any,size=200){
 await act(async()=>{tree.root.findByProps({'aria-label':'LIYANNA JSON file'}).props.onChange({target:{files:[{size,name:'snapshot.json',text:async()=>JSON.stringify(data)}],value:'snapshot.json'}})});
}
test('unauthenticated review cannot upload or call the receiver',async()=>{
 let tree:any,calls=0;try{
 await act(async()=>{tree=create(React.createElement(LiyannaPreview,{preview:true,api:async()=>{calls++;return reviewed},mappings:[{category:'sales'}]}))});
 assert.equal(tree.root.findByProps({'aria-label':'LIYANNA JSON file'}).props.disabled,true);
 assert.equal(tree.root.findByProps({'aria-label':'Preview invoice mapping'}).props.disabled,true);
 assert.equal(calls,0);
 }finally{await act(async()=>tree?.unmount())}
});
test('file review requires explicit consent and posts only to preview endpoint',async()=>{
 let tree:any;const calls:any[]=[];
 try{
 await act(async()=>{tree=create(React.createElement(LiyannaPreview,{api:async(path:string,body:unknown)=>{calls.push({path,body});return reviewed},mappings:[{category:'sales'}]}))});
 await upload(tree);
 await act(async()=>tree.root.findByProps({'aria-label':'FINBASE revenue category'}).props.onChange({target:{value:'sales'}}));
 assert.equal(tree.root.findByProps({'aria-label':'Preview invoice mapping'}).props.disabled,true);
 await act(async()=>tree.root.findByProps({'aria-label':'Send snapshot for review'}).props.onChange({target:{checked:true}}));
 await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
 assert.equal(calls.length,1);assert.equal(calls[0].path,'integrations/liyanna/preview');
 assert.deepEqual(calls[0].body,{sourceBusinessId:data.businessId,categoryId:'sales',snapshot:data});
 assert.match(JSON.stringify(tree.toJSON()),/not imported/);
 }finally{await act(async()=>tree?.unmount())}
});
test('oversized files are rejected before any API transmission',async()=>{
 let tree:any,calls=0;try{
 await act(async()=>{tree=create(React.createElement(LiyannaPreview,{api:async()=>{calls++;return reviewed},mappings:[{category:'sales'}]}))});
 await upload(tree,60001);assert.match(JSON.stringify(tree.toJSON()),/under 60 KB/);assert.equal(calls,0);
 }finally{await act(async()=>tree?.unmount())}
});
test('loss of access clears loaded file data and late review results',async()=>{
 let tree:any,resolve:any;const api=async()=>new Promise(r=>{resolve=r});
 try{
 await act(async()=>{tree=create(React.createElement(LiyannaPreview,{api,mappings:[{category:'sales'}]}))});
 await upload(tree);
 await act(async()=>tree.root.findByProps({'aria-label':'FINBASE revenue category'}).props.onChange({target:{value:'sales'}}));
 await act(async()=>tree.root.findByProps({'aria-label':'Send snapshot for review'}).props.onChange({target:{checked:true}}));
 await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
 await act(async()=>tree.update(React.createElement(LiyannaPreview,{api,preview:true,mappings:[{category:'sales'}]})));
 await act(async()=>resolve(reviewed));
 assert.doesNotMatch(JSON.stringify(tree.toJSON()),/snapshot.json|record\(s\) reviewed/);
 assert.equal(tree.root.findByProps({'aria-label':'Preview invoice mapping'}).props.disabled,true);
 }finally{await act(async()=>tree?.unmount())}
});
