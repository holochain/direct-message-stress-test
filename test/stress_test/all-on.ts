import { Config } from '@holochain/tryorama'
import * as R from 'ramda'
import { Batch } from '@holochain/tryorama-stress-utils'

module.exports = (scenario, configBatch, N, C, I) => {
  const totalConductors = N*C;
  scenario('DDOS an agent', async (s, t) => {
    // This stress test is to swamp an agent with loads of direct messages and see at what point this fails
    // Every agent will message agent0 
    const players = R.sortBy(p => parseInt(p.name, 10), R.values(await s.players(configBatch(totalConductors, I), true)))
    const batch = new Batch(players).iteration('series')

    // Lets collect all agents, and use this to reliably enumerate an agent by agentAddress
    const agents = await batch.mapInstances(
      instance => new Promise( (resolve, reject) => resolve( instance.agentAddress ))
    )
    console.log( "***DEBUG***: all agents: " + JSON.stringify( agents, null, 2 ))

    await s.consistency()

    // do the messaging
    let agent0Address = agents[0]
    console.log("Agent to receive DDOS: " + agent0Address)
    const messageResult = await batch.mapInstances( instance =>
        instance.call('main', 'send_message', {to: agent0Address})
    )
    console.log("NUM_AGENTS" + R.length(messageResult)); 

    console.log( "***DEBUG***: all promises: " + JSON.stringify( messageResult, null, 2 ))
    t.ok(messageResult.every(r => r.Ok))


  })
}
 