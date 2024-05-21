/* eslint-disable prefer-const */
import { BigInt } from '@graphprotocol/graph-ts'
import { PlantStakeInfo, PlantStakeUser, PlantStakeTx } from '../types/schema'
import { Stake, Unstake } from '../types/PlantStaking/PlantStaking'

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let BI_18 = BigInt.fromI32(18)

// event Stake(uint256 indexed txid, address indexed staker, address cspminer, uint256 amount); 
export function handleStake(event: Stake): void {
  let plantStakeInfo = PlantStakeInfo.load("PlantStakeInfo")
  if (plantStakeInfo === null) {
    plantStakeInfo = new PlantStakeInfo("PlantStakeInfo")
    plantStakeInfo.stakeUserCounter = 0
    plantStakeInfo.stakeTxCounter = 0
    plantStakeInfo.allStakeAmount = ZERO_BI
    plantStakeInfo.allRewardAmount = ZERO_BI
    plantStakeInfo.save()
  }

  let stakerEntity = 'PlantStake-' + event.params.staker.toHexString()
  let plantStakeUser = PlantStakeUser.load(stakerEntity)
  if (plantStakeUser === null) {
    plantStakeUser = new PlantStakeUser(stakerEntity)
    plantStakeUser.stakeTxCounter = 0 
    plantStakeUser.allStakeAmount = ZERO_BI
    plantStakeUser.allRewardAmount = ZERO_BI
    plantStakeUser.save()

    plantStakeInfo.stakeUserCounter = plantStakeInfo.stakeUserCounter + 1
    plantStakeInfo.save()
  }

  plantStakeInfo.stakeTxCounter = plantStakeInfo.stakeTxCounter + 1
  plantStakeInfo.allStakeAmount = plantStakeInfo.allStakeAmount.plus(event.params.amount)
  plantStakeInfo.save()

  let plantStakeTx = new PlantStakeTx(event.transaction.hash.toHexString())
  plantStakeTx.stakeTxSN = plantStakeInfo.stakeTxCounter
  plantStakeTx.staker = event.params.staker.toHexString()
  plantStakeTx.nonce = plantStakeUser.stakeTxCounter
  plantStakeTx.stakeType = "Stake"
  plantStakeTx.txid = event.params.txid.toString()
  plantStakeTx.cspMiner = event.params.cspminer.toHexString()
  plantStakeTx.amount = event.params.amount
  plantStakeTx.reward = ZERO_BI
  plantStakeTx.save()

  plantStakeUser.stakeTxCounter = plantStakeUser.stakeTxCounter + 1
  plantStakeUser.allStakeAmount = plantStakeUser.allStakeAmount.plus(event.params.amount)
  plantStakeUser.save()

}

// event Unstake(indexed uint256,indexed address,address,uint256,uint256)
export function handleUnStakeWithReward(event: Unstake): void {
  let plantStakeInfo = PlantStakeInfo.load("PlantStakeInfo")!
  plantStakeInfo.stakeTxCounter = plantStakeInfo.stakeTxCounter + 1  
  plantStakeInfo.allStakeAmount = plantStakeInfo.allStakeAmount.minus(event.params.amount)
  plantStakeInfo.allRewardAmount = plantStakeInfo.allRewardAmount.plus(event.params.reward)
  plantStakeInfo.save()

  let stakerEntity = 'PlantStake-' + event.params.staker.toHexString()
  let plantStakeUser = PlantStakeUser.load(stakerEntity)!

  let plantStakeTx = new PlantStakeTx(event.transaction.hash.toHexString())
  plantStakeTx.stakeTxSN = plantStakeInfo.stakeTxCounter
  plantStakeTx.staker = event.params.staker.toHexString()
  plantStakeTx.nonce = plantStakeUser.stakeTxCounter
  plantStakeTx.stakeType = "Unstake"
  plantStakeTx.txid = event.params.txid.toString()
  plantStakeTx.cspMiner = event.params.cspminer.toHexString()
  plantStakeTx.amount = event.params.amount
  plantStakeTx.reward = event.params.reward
  plantStakeTx.save()

  plantStakeUser.stakeTxCounter = plantStakeUser.stakeTxCounter + 1
  plantStakeUser.allStakeAmount = plantStakeUser.allStakeAmount.minus(event.params.amount)
  plantStakeUser.allRewardAmount = plantStakeUser.allRewardAmount.plus(event.params.reward)
  plantStakeUser.save()
}

