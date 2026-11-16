const h = require('./harness'); const f = require('./flows'); const e = require('./e2e');
h.test('X1','e2e',async({browser,sub})=>{
  const page = await h.newPage(browser);
  await h.demoNew(page);
  await e.buildAll(page,{sub,mode:'demo'});
  await h.shot(page,'try-actions');
  await e.finishVerify(page,{sub});
});
h.run('try');
