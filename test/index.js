/// NB: The tryorama config patterns are still not quite stabilized.
/// See the tryorama README [https://github.com/holochain/tryorama]
/// for a potentially more accurate example

const path = require('path')

const { Orchestrator, Config, combine, singleConductor, localOnly, tapeExecutor } = require('@holochain/tryorama')

process.on('unhandledRejection', error => {
  // Will print "unhandledRejection err is not defined"
  console.error('got unhandledRejection:', error);
});

const dnaPath = path.join(__dirname, "../dist/dna_panic_on_receive.dna.json")

const orchestrator = new Orchestrator({
  middleware: combine(
    // use the tape harness to run the tests, injects the tape API into each scenario
    // as the second argument
    tapeExecutor(require('tape')),

    // specify that all "players" in the test are on the local machine, rather than
    // on remote machines
    localOnly,
  ),
})
const network = {
  type: 'sim2h',
  sim2h_url: 'ws://localhost:9000'
}
const dna = Config.dna(dnaPath, 'scaffold-test')
const conductorConfig = Config.gen({app: dna}, {network})

orchestrator.registerScenario("send a direct message where the receive function panics", async (s, t) => {
  const {alice, bob} = await s.players({alice: conductorConfig, bob: conductorConfig}, true)
  const response = await alice.call("app", "main", "send_message", {"to" : bob.info('app').agentAddress})
  console.log(response)
  t.equal(response, {})
})

orchestrator.registerScenario("commit an entry and drop the author offline before it can propagate", async (s, t) => {
  const {alice, bob} = await s.players({alice: conductorConfig, bob: conductorConfig}, true)
  const addr = await alice.call("app", "main", "commit_a", {})
  alice.kill()
  await s.consistency()
  t.ok(addr.Ok)
})



orchestrator.run()
