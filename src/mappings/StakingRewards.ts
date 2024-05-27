/* eslint-disable prefer-const */
import { BigInt, Address } from '@graphprotocol/graph-ts'
import { StakingRewardsInfo, StakingRewardsUser, StakeTransaction } from '../types/schema'
import { Staked, Withdrawn, RewardPaid, StakingRewards, RewardStakeUpdated } from '../types/StakingRewards/StakingRewards'
import { SetStakeParameter, RewardAdded } from '../types/StakingRewards/StakingRewards'

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let BI_18 = BigInt.fromI32(18)

const Staking_Rewards_Address = "0xe233f1aC801eD919A774295503eCFE359A647B8B"

const DefaultPremiumCap = BigInt.fromString('6000000000000000000000')     // 6000 AKRE 
const DefaultPremiumRate = 200

// event Staked(address indexed user, uint256 amount);
export function handleStake(event: Staked): void {
  let stakeTransaction = StakeTransaction.load(event.transaction.hash.toHexString())!
  stakeTransaction.type = "Stake"
  stakeTransaction.amountTransaction = event.params.amount
  stakeTransaction.save()

  let stakingRewardsInfo = StakingRewardsInfo.load("StakingRewardsInfo")!
  stakingRewardsInfo.sumStakes = stakingRewardsInfo.sumStakes.plus(event.params.amount)
  stakingRewardsInfo.MinerTxCounter = stakingRewardsInfo.MinerTxCounter - 1
  stakingRewardsInfo.stakeCounter = stakingRewardsInfo.stakeCounter + 1
  stakingRewardsInfo.save()

  let stakingRewardsUser = StakingRewardsUser.load(event.params.user.toHexString())!

  stakingRewardsUser.MinerTxCounterUser = stakingRewardsUser.MinerTxCounterUser - 1
  stakingRewardsUser.stakeCounterUser = stakingRewardsUser.stakeCounterUser + 1
  stakingRewardsUser.save()
}

// event Withdrawn(address indexed user, uint256 amount);
export function handleWithdrawn(event: Withdrawn): void {
  let stakeTransaction = StakeTransaction.load(event.transaction.hash.toHexString())!
  stakeTransaction.type = "Unstake"
  stakeTransaction.amountTransaction = event.params.amount
  stakeTransaction.save()

  let stakingRewardsInfo = StakingRewardsInfo.load("StakingRewardsInfo")!
  stakingRewardsInfo.sumUntakes = stakingRewardsInfo.sumUntakes.plus(event.params.amount)
  stakingRewardsInfo.MinerTxCounter = stakingRewardsInfo.MinerTxCounter - 1
  stakingRewardsInfo.unstakeCounter = stakingRewardsInfo.unstakeCounter + 1
  stakingRewardsInfo.save()

  let stakingRewardsUser = StakingRewardsUser.load(event.params.user.toHexString())!

  stakingRewardsUser.MinerTxCounterUser = stakingRewardsUser.MinerTxCounterUser - 1
  stakingRewardsUser.unstakeCounterUser = stakingRewardsUser.unstakeCounterUser + 1
  stakingRewardsUser.save()
}

// event RewardPaid(address indexed user, uint256 reward);
export function handleStakeRewardPaid(event: RewardPaid): void {

  let stakerUser = event.params.user.toHexString()

  let stakingRewardsInfo = StakingRewardsInfo.load("StakingRewardsInfo")!
  stakingRewardsInfo.counterTransaction = stakingRewardsInfo.counterTransaction.plus(ONE_BI)
  stakingRewardsInfo.sumRewards = stakingRewardsInfo.sumRewards.plus(event.params.reward)
  stakingRewardsInfo.rewardClaimCounter = stakingRewardsInfo.rewardClaimCounter + 1
  stakingRewardsInfo.save()

  let stakingRewardsUser = StakingRewardsUser.load(stakerUser)!
  stakingRewardsUser.sumRewards = stakingRewardsUser.sumRewards.plus(event.params.reward)
  stakingRewardsUser.rewardClaimCounter = stakingRewardsUser.rewardClaimCounter + 1
  stakingRewardsUser.save()

  let stakeTransaction = new StakeTransaction(event.transaction.hash.toHexString())
  stakeTransaction.user = stakerUser
  stakeTransaction.type = "ClaimReward"
  stakeTransaction.timeStamp = event.block.timestamp

  stakeTransaction.idTransaction = stakingRewardsInfo.counterTransaction
  stakeTransaction.amountTransaction =  event.params.reward
  stakeTransaction.totalStakes = stakingRewardsInfo.totalStakes
  stakeTransaction.totalRewardStakes = stakingRewardsInfo.totalRewardStakes
  stakeTransaction.totalNormalStakes = stakingRewardsInfo.totalNormalStakes
  stakeTransaction.totalBoostStakes = stakingRewardsInfo.totalBoostStakes

  stakeTransaction.minerStakedChange = 0
  stakeTransaction.totalStakesUser = stakingRewardsUser.totalStakesUser
  stakeTransaction.totalRewardStakesUser = stakingRewardsUser.totalRewardStakesUser
  stakeTransaction.totalNormalStakesUser = stakingRewardsUser.totalNormalStakesUser
  stakeTransaction.totalBoostStakesUser = stakingRewardsUser.totalBoostStakesUser
  
  stakeTransaction.save()
}

// event RewardAdded(uint256 startTime, uint256 endTime, uint256 reward);
export function handleRewardAdded(event: RewardAdded): void {

  let stakingRewardsInfo = StakingRewardsInfo.load("StakingRewardsInfo")
  if (stakingRewardsInfo === null) {
    stakingRewardsInfo = new StakingRewardsInfo("StakingRewardsInfo")
   
    stakingRewardsInfo.counterTransaction = ZERO_BI
    stakingRewardsInfo.periodStart = ZERO_BI
    stakingRewardsInfo.periodEnd = ZERO_BI
    stakingRewardsInfo.totalReward = ZERO_BI
    stakingRewardsInfo.lastUpdateTime = ZERO_BI
    stakingRewardsInfo.lastBlockHeight = ZERO_BI

    stakingRewardsInfo.sumStakes = ZERO_BI
    stakingRewardsInfo.sumUntakes = ZERO_BI
    stakingRewardsInfo.sumRewards = ZERO_BI

    stakingRewardsInfo.totalStakes = ZERO_BI
    stakingRewardsInfo.totalRewardStakes = ZERO_BI
    stakingRewardsInfo.totalNormalStakes = ZERO_BI
    stakingRewardsInfo.totalBoostStakes = ZERO_BI
    stakingRewardsInfo.rewardRate = ZERO_BI
    stakingRewardsInfo.rewardPerStakeLast = ZERO_BI
    stakingRewardsInfo.capMinerBoost = DefaultPremiumCap

    stakingRewardsInfo.rateBoost = DefaultPremiumRate
    stakingRewardsInfo.minerStaked = 0
    stakingRewardsInfo.MinerTxCounter = 0
    stakingRewardsInfo.stakeCounter = 0
    stakingRewardsInfo.unstakeCounter = 0
    stakingRewardsInfo.rewardClaimCounter = 0

    stakingRewardsInfo.save()
  }
  
  stakingRewardsInfo.periodStart = event.params.startTime
  stakingRewardsInfo.periodEnd = event.params.endTime
  stakingRewardsInfo.totalReward = event.params.reward

  let stakingRewards = StakingRewards.bind(Address.fromString(Staking_Rewards_Address))
  let rewardRate = stakingRewards.rewardRate()
  stakingRewardsInfo.rewardRate = rewardRate
  stakingRewardsInfo.save()
}

// event SetStakeParameter(uint256 newPremiumCap, uint256 newPremiumRate);
export function handleSetStakeParameter(event: SetStakeParameter): void {
  let stakingRewardsInfo = StakingRewardsInfo.load("StakingRewardsInfo")
  if (stakingRewardsInfo === null) {
    stakingRewardsInfo = new StakingRewardsInfo("StakingRewardsInfo")

    stakingRewardsInfo.counterTransaction = ZERO_BI    
    stakingRewardsInfo.periodStart = ZERO_BI
    stakingRewardsInfo.periodEnd = ZERO_BI
    stakingRewardsInfo.totalReward = ZERO_BI
    stakingRewardsInfo.lastUpdateTime = ZERO_BI
    stakingRewardsInfo.lastBlockHeight = ZERO_BI

    stakingRewardsInfo.sumStakes = ZERO_BI
    stakingRewardsInfo.sumUntakes = ZERO_BI
    stakingRewardsInfo.sumRewards = ZERO_BI

    stakingRewardsInfo.totalStakes = ZERO_BI
    stakingRewardsInfo.totalRewardStakes = ZERO_BI
    stakingRewardsInfo.totalNormalStakes = ZERO_BI
    stakingRewardsInfo.totalBoostStakes = ZERO_BI
    stakingRewardsInfo.rewardRate = ZERO_BI
    stakingRewardsInfo.rewardPerStakeLast = ZERO_BI
    stakingRewardsInfo.capMinerBoost = ZERO_BI

    stakingRewardsInfo.rateBoost = 0
    stakingRewardsInfo.minerStaked = 0
    stakingRewardsInfo.MinerTxCounter = 0
    stakingRewardsInfo.stakeCounter = 0
    stakingRewardsInfo.unstakeCounter = 0
    stakingRewardsInfo.rewardClaimCounter = 0

    stakingRewardsInfo.save()
  }

  stakingRewardsInfo.capMinerBoost = event.params.newPremiumCap
  stakingRewardsInfo.rateBoost = event.params.newPremiumRate.toU32()
  stakingRewardsInfo.save()
}

//event RewardStakeUpdated(address indexed user, uint256 totalMiners, uint256 userRewardStakes, uint256 totalRewardStakes);
export function handleRewardStakeUpdated(event: RewardStakeUpdated): void {

  let stakingRewards = StakingRewards.bind(Address.fromString(Staking_Rewards_Address))

  let stakingRewardsInfo = StakingRewardsInfo.load("StakingRewardsInfo")
  if (stakingRewardsInfo === null) {
    stakingRewardsInfo = new StakingRewardsInfo("StakingRewardsInfo")
    
    stakingRewardsInfo.counterTransaction = ZERO_BI
    stakingRewardsInfo.periodStart = ZERO_BI
    stakingRewardsInfo.periodEnd = ZERO_BI
    stakingRewardsInfo.totalReward = ZERO_BI
    stakingRewardsInfo.lastUpdateTime = ZERO_BI
    stakingRewardsInfo.lastBlockHeight = ZERO_BI

    stakingRewardsInfo.sumStakes = ZERO_BI
    stakingRewardsInfo.sumUntakes = ZERO_BI
    stakingRewardsInfo.sumRewards = ZERO_BI

    stakingRewardsInfo.totalStakes = ZERO_BI
    stakingRewardsInfo.totalRewardStakes = ZERO_BI
    stakingRewardsInfo.totalNormalStakes = ZERO_BI
    stakingRewardsInfo.totalBoostStakes = ZERO_BI
    stakingRewardsInfo.rewardRate = ZERO_BI
    stakingRewardsInfo.rewardPerStakeLast = ZERO_BI
    stakingRewardsInfo.capMinerBoost = DefaultPremiumCap

    stakingRewardsInfo.rateBoost = DefaultPremiumRate
    stakingRewardsInfo.minerStaked = 0
    stakingRewardsInfo.MinerTxCounter = 0
    stakingRewardsInfo.stakeCounter = 0
    stakingRewardsInfo.unstakeCounter = 0
    stakingRewardsInfo.rewardClaimCounter = 0

    stakingRewardsInfo.save()
  }

  let stakerUser = event.params.user.toHexString()
  let stakingRewardsUser = StakingRewardsUser.load(stakerUser)

  if (stakingRewardsUser === null) {
    stakingRewardsUser = new StakingRewardsUser(stakerUser)

    stakingRewardsUser.lastTimeUser = ZERO_BI
    stakingRewardsUser.lastBlockHeightUser = ZERO_BI
    stakingRewardsUser.sumRewards = ZERO_BI
    stakingRewardsUser.totalStakesUser = ZERO_BI
    stakingRewardsUser.totalRewardStakesUser = ZERO_BI
    stakingRewardsUser.totalNormalStakesUser = ZERO_BI
    stakingRewardsUser.totalBoostStakesUser = ZERO_BI
    stakingRewardsUser.minerStakedUser = 0
    stakingRewardsUser.MinerTxCounterUser = 0
    stakingRewardsUser.stakeCounterUser = 0
    stakingRewardsUser.unstakeCounterUser = 0
    stakingRewardsUser.rewardClaimCounter = 0

    stakingRewardsUser.save()
  }

  let myStakes = stakingRewards.myStakes(event.params.user)
  let minerStakedUserOld = stakingRewardsUser.minerStakedUser

  stakingRewardsUser.lastTimeUser = event.block.timestamp
  stakingRewardsUser.lastBlockHeightUser = event.block.number
  stakingRewardsUser.totalStakesUser = myStakes
  stakingRewardsUser.totalRewardStakesUser = event.params.userRewardStakes
  stakingRewardsUser.minerStakedUser = event.params.totalMiners.toU32()

  if(event.params.userRewardStakes <= myStakes) {                // Only == 
    stakingRewardsUser.totalNormalStakesUser = myStakes
    stakingRewardsUser.totalBoostStakesUser = ZERO_BI
  } else { 
    stakingRewardsUser.totalBoostStakesUser = event.params.userRewardStakes.minus(myStakes)
                                                .times(BigInt.fromI32(100))
                                                .div(BigInt.fromI32(stakingRewardsInfo.rateBoost-100))

    stakingRewardsUser.totalNormalStakesUser = myStakes.minus(stakingRewardsUser.totalBoostStakesUser)
  }
  
  stakingRewardsUser.MinerTxCounterUser = stakingRewardsUser.MinerTxCounterUser + 1
  stakingRewardsUser.save()

  let totalStakes = stakingRewards.totalStakes()
  let rewardPerStakeLast = stakingRewards.rewardPerStakeLast()

  stakingRewardsInfo.counterTransaction = stakingRewardsInfo.counterTransaction.plus(ONE_BI)

  stakingRewardsInfo.lastUpdateTime = event.block.timestamp
  stakingRewardsInfo.lastBlockHeight = event.block.number
  stakingRewardsInfo.totalStakes = totalStakes
  stakingRewardsInfo.totalRewardStakes = event.params.totalRewardStakes


  if(event.params.totalRewardStakes <=  totalStakes) {
    stakingRewardsInfo.totalNormalStakes = totalStakes
    stakingRewardsInfo.totalBoostStakes = ZERO_BI
  } else { 
    stakingRewardsInfo.totalBoostStakes = event.params.totalRewardStakes.minus(totalStakes)
                                                .times(BigInt.fromI32(100))
                                                .div(BigInt.fromI32(stakingRewardsInfo.rateBoost-100))

    stakingRewardsInfo.totalNormalStakes = totalStakes.minus(stakingRewardsInfo.totalBoostStakes)
  }

  stakingRewardsInfo.rewardPerStakeLast = rewardPerStakeLast    // skip: rewardRate, capMinerBoost, rateBoost, stakeCounter, unstakeCounter, rewardClaimCounter
  stakingRewardsInfo.minerStaked =  stakingRewardsInfo.minerStaked - minerStakedUserOld + stakingRewardsUser.minerStakedUser
  stakingRewardsInfo.MinerTxCounter = stakingRewardsInfo.MinerTxCounter + 1
  stakingRewardsInfo.save()

  let stakeTransaction = new StakeTransaction(event.transaction.hash.toHexString())
  
  stakeTransaction.user = stakerUser
  stakeTransaction.type = "MinerOnboard"
  stakeTransaction.timeStamp = event.block.timestamp

  stakeTransaction.idTransaction = stakingRewardsInfo.counterTransaction
  stakeTransaction.amountTransaction =  event.params.totalMiners
  stakeTransaction.totalStakes = stakingRewardsInfo.totalStakes
  stakeTransaction.totalRewardStakes = stakingRewardsInfo.totalRewardStakes
  stakeTransaction.totalNormalStakes = stakingRewardsInfo.totalNormalStakes
  stakeTransaction.totalBoostStakes = stakingRewardsInfo.totalBoostStakes

  stakeTransaction.minerStakedChange = event.params.totalMiners.toU32() - minerStakedUserOld
  stakeTransaction.totalStakesUser = stakingRewardsUser.totalStakesUser
  stakeTransaction.totalRewardStakesUser = stakingRewardsUser.totalRewardStakesUser
  stakeTransaction.totalNormalStakesUser = stakingRewardsUser.totalNormalStakesUser
  stakeTransaction.totalBoostStakesUser = stakingRewardsUser.totalBoostStakesUser
  
  stakeTransaction.save()
}