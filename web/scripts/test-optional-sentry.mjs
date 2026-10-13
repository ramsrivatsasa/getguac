import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import vm from 'node:vm'

const source=await readFile('src/instrumentation-client.js','utf8')
for(const enabled of [false,true]) {
  const calls=[],context=vm.createContext({process:{env:{NEXT_PUBLIC_SENTRY_DSN:enabled?'https://synthetic.example/1':''}}})
  const sdk=new vm.SyntheticModule(['init','captureRouterTransitionStart'],function(){
    this.setExport('init',options=>calls.push(['init',options]))
    this.setExport('captureRouterTransitionStart',(...args)=>calls.push(['transition',...args]))
  },{context})
  let imports=0
  const module=new vm.SourceTextModule(source,{context,importModuleDynamically:async()=>{imports++;await sdk.link(()=>{});await sdk.evaluate();return sdk}})
  await module.link(()=>{throw Error('No eager SDK import allowed')});await module.evaluate()
  module.namespace.onRouterTransitionStart('/academy','push','link')
  await new Promise(resolve=>setTimeout(resolve,20))
  assert.equal(imports,enabled?1:0)
  if(enabled){assert.equal(calls[0][0],'init');assert.equal(calls[0][1].replaysOnErrorSampleRate,1);assert.equal(calls[1][1],'/academy');module.namespace.onRouterTransitionStart('/money-bootcamp');assert.equal(calls[2][1],'/money-bootcamp')}
  else assert.deepEqual(calls,[])
}
console.log('PASS optional SDK absent with no DSN, configured initialization and transitions before/after lazy load')
