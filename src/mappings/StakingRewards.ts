/* eslint-disable prefer-const */
import { BigInt, Address } from '@graphprotocol/graph-ts'
import { StakingRewardsInfo, StakingRewardsUser } from '../types/schema'
import { Staked, Withdrawn, RewardPaid, StakingRewards } from '../types/StakingRewards/StakingRewards'

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let BI_18 = BigInt.fromI32(18)

const Staking_Rewards_Address = "0x691938a6e88a85E66Aab05ECf84Fe84ECE8351C9"

// event Staked(address indexed user, uint256 amount);
export function handleStake(event: Staked): void {

  let stakingRewardsInfo = StakingRewardsInfo.load("StakingRewardsInfo")
  if (stakingRewardsInfo === null) {
    stakingRewardsInfo = new StakingRewardsInfo("StakingRewardsInfo")

    stakingRewardsInfo.periodStart = 0
    stakingRewardsInfo.periodEnd = 0
    stakingRewardsInfo.lastUpdateTime = 0
    stakingRewardsInfo.lastBlockHeight = ZERO_BI

    stakingRewardsInfo.totalStakes = ZERO_BI
    stakingRewardsInfo.totalRewardStakes = ZERO_BI
    stakingRewardsInfo.totalNormalStakes = ZERO_BI
    stakingRewardsInfo.totalBoostStakes = ZERO_BI
    stakingRewardsInfo.rewardRate = ZERO_BI
    stakingRewardsInfo.rewardPerStakeLast = ZERO_BI
    stakingRewardsInfo.capMinerBoost = ZERO_BI

    stakingRewardsInfo.rateBoost = 0
    stakingRewardsInfo.minerStaked = 0
    stakingRewardsInfo.stakeCounter = 0
    stakingRewardsInfo.unstakeCounter = 0

    stakingRewardsInfo.save()
  }

  let stakerUser = 'StakingAKRE-' + event.params.user.toHexString()
  let stakingRewardsUser = StakingRewardsUser.load(stakerUser)

  if (stakingRewardsUser === null) {
    stakingRewardsUser = new StakingRewardsUser(stakerUser)

    stakingRewardsUser.lastTimeUser = 0
    stakingRewardsUser.lastBlockHeightUser = ZERO_BI
    stakingRewardsUser.totalStakesUser = ZERO_BI
    stakingRewardsUser.totalRewardStakesUser = ZERO_BI
    stakingRewardsUser.totalNormalStakesUser = ZERO_BI
    stakingRewardsUser.totalBoostStakesUser = ZERO_BI

    stakingRewardsUser.minerStakedUser = 0
    stakingRewardsUser.stakeCounterUser = 0
    stakingRewardsUser.unstakeCounterUser = 0
    stakingRewardsUser.save()
  }

  stakingRewardsUser.lastTimeUser = event.block.timestamp.toI32()
  stakingRewardsUser.lastBlockHeightUser = event.block.number
  stakingRewardsUser.totalStakesUser = stakingRewardsUser.totalStakesUser.plus(event.params.amount)

  let stakingRewards = StakingRewards.bind(Address.fromString(Staking_Rewards_Address))
  let userStakeStatusResult = stakingRewards.try_getUserStakeStatus(event.params.user)
  
  if (userStakeStatusResult.reverted) {
    let actionInfo = userStakeStatusResult.value
  } else {
    let userStakeStatus = userStakeStatusResult.value
    userStakeStatus.

  }


  let maxBoostStake = stakingRewardsInfo.capMinerBoost.times(stakingRewardsUser.minerStakedUser)

  if(stakingRewardsUser.totalStakesUser.gt(maxBoostStake)) {
    stakingRewardsUser.totalNormalStakesUser = stakingRewardsUser.totalStakesUser.minus(maxBoostStake)
    stakingRewardsUser.totalBoostStakesUser = maxBoostStake
  } else {

  }
  stakingRewardsUser.totalNormalStakesUser =  if()


  stakingRewardsUser.totalBoostStakesUser = 

/*  
  lastTimeUser:           Int!
  lastBlockHeightUser:    BigInt!
  totalStakesUser:        BigInt!
  totalRewardStakesUser:  BigInt!
  totalNormalStakesUser:  BigInt!
  totalBoostStakesUser:    BigInt!
  minerStakedUser:        Int!
  stakeCounterUser:       Int!
  unstakeCounterUser:     Int!
*/


}

// event Withdrawn(indexed address,uint256)
export function handleWithdrawn(event: Withdrawn): void {
}

// event RewardPaid(indexed address,uint256)
export function handleStakeRewardPaid(event: RewardPaid): void {
}
