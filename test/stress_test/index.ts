import { Config } from '@holochain/tryorama'
import * as R from 'ramda'

const { Orchestrator, tapeExecutor, singleConductor, compose, localOnly, machinePerPlayer } = require('@holochain/tryorama')

process.on('unhandledRejection', error => {
  console.error('got unhandledRejection:', error);
});

const networkType = process.env.APP_SPEC_NETWORK_TYPE || 'sim2h'
let network = null

// default middleware is localOnly
let middleware = compose(tapeExecutor(require('tape')), localOnly)

switch (networkType) {
  case 'memory':
    network = Config.network('memory')
    middleware = compose(tapeExecutor(require('tape')), singleConductor)
    break
  case 'sim1h':
    network = {
      type: 'sim1h',
      dynamo_url: "http://localhost:8000",
    }
    break
  case 'sim2h':
    network = {
      type: 'sim2h',
      sim2h_url: "ws://localhost:9000",
    }
    break
  case 'sim2h_public':
      network = {
          type: 'sim2h',
          sim2h_url: "wss://sim2h.holochain.org:9000",
      }
      break
  default:
    throw new Error(`Unsupported network type: ${networkType}`)
}

if (process.env.HC_TRANSPORT_CONFIG) {
    network=require(process.env.HC_TRANSPORT_CONFIG)
    console.log("setting network from:"+process.env.HC_TRANSPORT_CONFIG)
}

// default stress test is local (because there are no endpoints specified)
let stress_config = {
    conductors: 4,
    instances: 20,
    endpoints: undefined
}

let run_name = ""+Date.now()  // default exam name is just a timestamp
// first arg is the exam name
if (process.argv[2]) {
    run_name=process.argv[2]
}

// second arg is an optional stress config file
if (process.argv[3]) {
    stress_config=require(process.argv[3])
}


const dnaLocal = Config.dna(
  '../dist/direct_message_stress_test.dna.json',
  'dm_stress_test'
)

let chosenDna = dnaLocal;

/** Builder function for a function that generates a bunch of identical conductor configs
 with multiple identical instances */
const makeBatcher = (dna, commonConfig) => (numConductors, numInstances) => {
    const conductor = R.pipe(
        R.map(n => [`${n}`, dna]),
        R.fromPairs,
        instances => Config.gen(instances, commonConfig),
    )(R.range(0, numInstances))
    return R.repeat(conductor, numConductors)
}

let metric_publisher = {type: 'logger'}

console.log("using dna: "+ JSON.stringify(chosenDna))
console.log("using network: "+ JSON.stringify(network))
const orchestrator = new Orchestrator({
    middleware,
})

const commonConfig = {
  network,
  logger: Config.logger(true),
  metric_publisher
}
const batcher = makeBatcher(chosenDna, commonConfig)

console.log(`Running stress test id=${run_name} with N=${stress_config.conductors}, M=${stress_config.instances}`)

require('./all-on')(orchestrator.registerScenario, batcher, stress_config.conductors, stress_config.instances)

orchestrator.run()
