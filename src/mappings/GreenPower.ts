/* eslint-disable prefer-const */
import { BigInt, Address, log } from '@graphprotocol/graph-ts'
import { GreenPowerTx, GreenPowerInfo, GreenPowerUser, GreenPowerMiner } from '../types/schema'
import { Offset, Stake, Unstake, Reward, Deposit, Withdraw } from '../types/GreenPower/GreenPower'

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let BI_18 = BigInt.fromI32(18)

// Offset(address indexed txid, address indexed greener, OffsetAction[] offsetActions, address tokenToPay, uint256 stakeAmount, uint256 offsetBaseIndex, uint256 nonce);
export function handleOffset(event: Offset): void {

  let greenPowerInfo = GreenPowerInfo.load("GreenPowerInfo")
  if (greenPowerInfo ===null) {
    greenPowerInfo = new GreenPowerInfo("GreenPowerInfo")
    greenPowerInfo.counterTx = 0
    greenPowerInfo.counterUser = 0
    greenPowerInfo.counterMiner = 0
    greenPowerInfo.counterOffsetTx = 0
    greenPowerInfo.counterOffsetBatchTx = 0
    greenPowerInfo.counterOffsetAction = 0
    greenPowerInfo.counterStakeTx = 0
    greenPowerInfo.counterUnstakeTx = 0
    greenPowerInfo.counterRewardTx = 0

    greenPowerInfo.allOffsetAmount = ZERO_BI
    greenPowerInfo.allStakeAmount = ZERO_BI
    greenPowerInfo.allStakeSum = ZERO_BI
    greenPowerInfo.allUnstakeSum = ZERO_BI
    greenPowerInfo.allRewardAmount = ZERO_BI
    greenPowerInfo.save()
  } 

  let greenPowerUser = GreenPowerUser.load(event.params.greener.toHexString())
  if (greenPowerUser ===null) {
    greenPowerUser = new GreenPowerUser(event.params.greener.toHexString())
    greenPowerUser.offsetTxCounter = 0
    greenPowerUser.offsetActionCounter = 0
    greenPowerUser.stakeTxCounter = 0
    greenPowerUser.unstakeTxCounter = 0
    greenPowerUser.rewardTxCounter = 0
    greenPowerUser.allOffsetAmount = ZERO_BI
    greenPowerUser.allStakeAmount = ZERO_BI
    greenPowerUser.allStakeSum = ZERO_BI
    greenPowerUser.allUnstakeSum = ZERO_BI
    greenPowerUser.allRewardAmount = ZERO_BI
    greenPowerUser.nonce = 0
    greenPowerUser.save()

    greenPowerInfo.counterUser += 1
    greenPowerInfo.save()
  }

  let totalOffsetAmount = ZERO_BI
  for (let index =0; index < event.params.offsetActions.length; index++) {
    let plugMiner = event.params.offsetActions[index].plugMiner
    let offsetAmount = event.params.offsetActions[index].offsetAmount

    totalOffsetAmount = totalOffsetAmount.plus(offsetAmount)

    let greenPowerMiner = GreenPowerMiner.load(plugMiner.toHexString())
    if (greenPowerMiner ===null) {
      greenPowerMiner = new GreenPowerMiner(plugMiner.toHexString())
      greenPowerMiner.offsetTxCounter = 0
      greenPowerMiner.stakeTxCounter = 0
      greenPowerMiner.unstakeTxCounter = 0
      greenPowerMiner.allOffsetAmount = ZERO_BI
      greenPowerMiner.allStakeAmount = ZERO_BI
      greenPowerMiner.allStakeSum = ZERO_BI
      greenPowerMiner.allUnstakeSum = ZERO_BI
      greenPowerMiner.save()

      greenPowerInfo.counterMiner += 1
      greenPowerInfo.save()
    }

    greenPowerMiner.offsetTxCounter += 1
    greenPowerMiner.allOffsetAmount = greenPowerMiner.allOffsetAmount.plus(offsetAmount)
    greenPowerMiner.save()
  }

  greenPowerUser.offsetActionCounter += event.params.offsetActions.length
  greenPowerUser.offsetTxCounter += 1
  greenPowerUser.allOffsetAmount = greenPowerUser.allOffsetAmount.plus(totalOffsetAmount)
  if (greenPowerUser.nonce != event.params.nonce.toU32()) {
    log.warning('Nonce error: {} {}', [event.transaction.hash.toHexString(), event.params.nonce.toString()])
  }
  greenPowerUser.nonce += 1
  greenPowerUser.save()

  greenPowerInfo.counterTx += 1
  greenPowerInfo.counterOffsetAction += event.params.offsetActions.length
  greenPowerInfo.allOffsetAmount = greenPowerInfo.allOffsetAmount.plus(totalOffsetAmount)
  greenPowerInfo.counterOffsetTx += 1
  greenPowerInfo.save()

  let greenPowerTx = new GreenPowerTx(event.transaction.hash.toHexString())
  greenPowerTx.typeTx = "Offset"
  greenPowerTx.blockHash = event.block.hash.toHexString()
  greenPowerTx.txid = event.params.txid.toHexString()
  greenPowerTx.txSN = greenPowerInfo.counterTx
  greenPowerTx.greener = event.params.greener.toHexString()
  greenPowerTx.minerPower = '-'
  greenPowerTx.token = event.params.tokenToPay.toHexString()
  greenPowerTx.amount = event.params.stakeAmount
  greenPowerTx.offsetBaseIndex = event.params.offsetBaseIndex
  greenPowerTx.timestampTx = event.block.timestamp.toU32()
  greenPowerTx.period = 0
  greenPowerTx.nonce = event.params.nonce.toU32()
  greenPowerTx.save()
}

// event Stake(address indexed txid, address indexed greener, address plugMiner, uint256 amount, uint256 period, uint256 nonce);
export function handleStake(event: Stake): void {

  let greenPowerInfo = GreenPowerInfo.load("GreenPowerInfo")
  if (greenPowerInfo ===null) {
    greenPowerInfo = new GreenPowerInfo("GreenPowerInfo")
    greenPowerInfo.counterTx = 0
    greenPowerInfo.counterUser = 0
    greenPowerInfo.counterMiner = 0
    greenPowerInfo.counterOffsetTx = 0
    greenPowerInfo.counterOffsetBatchTx = 0
    greenPowerInfo.counterOffsetAction = 0
    greenPowerInfo.counterStakeTx = 0
    greenPowerInfo.counterUnstakeTx = 0
    greenPowerInfo.counterRewardTx = 0

    greenPowerInfo.allOffsetAmount = ZERO_BI
    greenPowerInfo.allStakeAmount = ZERO_BI
    greenPowerInfo.allStakeSum = ZERO_BI
    greenPowerInfo.allUnstakeSum = ZERO_BI
    greenPowerInfo.allRewardAmount = ZERO_BI
    greenPowerInfo.save()
  } 

  let greenPowerUser = GreenPowerUser.load(event.params.greener.toHexString())
  if (greenPowerUser ===null) {
    greenPowerUser = new GreenPowerUser(event.params.greener.toHexString())
    greenPowerUser.offsetTxCounter = 0
    greenPowerUser.offsetActionCounter = 0
    greenPowerUser.stakeTxCounter = 0
    greenPowerUser.unstakeTxCounter = 0
    greenPowerUser.rewardTxCounter = 0
    greenPowerUser.allOffsetAmount = ZERO_BI
    greenPowerUser.allStakeAmount = ZERO_BI
    greenPowerUser.allStakeSum = ZERO_BI
    greenPowerUser.allUnstakeSum = ZERO_BI
    greenPowerUser.allRewardAmount = ZERO_BI
    greenPowerUser.nonce = 0
    greenPowerUser.save()

    greenPowerInfo.counterUser += 1
    greenPowerInfo.save()
  }

  let greenPowerMiner = GreenPowerMiner.load(event.params.plugMiner.toHexString())
  if (greenPowerMiner ===null) {
    greenPowerMiner = new GreenPowerMiner(event.params.plugMiner.toHexString())
    greenPowerMiner.offsetTxCounter = 0
    greenPowerMiner.stakeTxCounter = 0
    greenPowerMiner.unstakeTxCounter = 0
    greenPowerMiner.allOffsetAmount = ZERO_BI
    greenPowerMiner.allStakeAmount = ZERO_BI
    greenPowerMiner.allStakeSum = ZERO_BI
    greenPowerMiner.allUnstakeSum = ZERO_BI
    greenPowerMiner.save()

    greenPowerInfo.counterMiner += 1
    greenPowerInfo.save()
  }

  greenPowerInfo.counterTx += 1
  greenPowerInfo.counterStakeTx += 1
  greenPowerInfo.allStakeAmount = greenPowerInfo.allStakeAmount.plus(event.params.amount)
  greenPowerInfo.allStakeSum = greenPowerInfo.allStakeSum.plus(event.params.amount)
  greenPowerInfo.save()

  let greenPowerTx = new GreenPowerTx(event.transaction.hash.toHexString())
  greenPowerTx.typeTx = "Stake"
  greenPowerTx.blockHash = event.block.hash.toHexString()
  greenPowerTx.txid = event.params.txid.toHexString()
  greenPowerTx.txSN = greenPowerInfo.counterTx
  greenPowerTx.greener = event.params.greener.toHexString()
  greenPowerTx.minerPower = event.params.plugMiner.toHexString()
  greenPowerTx.token = '-'
  greenPowerTx.amount = event.params.amount
  greenPowerTx.offsetBaseIndex = ZERO_BI
  greenPowerTx.timestampTx = event.block.timestamp.toU32()
  greenPowerTx.period = event.params.period.toU32()
  greenPowerTx.nonce = event.params.nonce.toU32()
  greenPowerTx.save()

  greenPowerUser.stakeTxCounter += 1 
  greenPowerUser.allStakeAmount = greenPowerUser.allStakeAmount.plus(event.params.amount)
  greenPowerUser.allStakeSum = greenPowerUser.allStakeSum.plus(event.params.amount)
  if (greenPowerUser.nonce != event.params.nonce.toU32()) {
    log.warning('Nonce error: {} {}', [event.transaction.hash.toHexString(), event.params.nonce.toString()])
  }
  greenPowerUser.nonce += 1
  greenPowerUser.save()
  
  greenPowerMiner.stakeTxCounter += 1
  greenPowerMiner.allStakeAmount = greenPowerMiner.allStakeAmount.plus(event.params.amount)
  greenPowerMiner.allStakeSum = greenPowerMiner.allStakeSum.plus(event.params.amount)
  greenPowerMiner.save()

}

// event Unstake(address indexed txid, address indexed greener, address plugMiner, uint256 amount, uint256 nonce);
export function handleUnstake(event: Unstake): void {
  let greenPowerInfo = GreenPowerInfo.load("GreenPowerInfo")!
  greenPowerInfo.counterTx += 1
  greenPowerInfo.counterUnstakeTx += 1
  greenPowerInfo.allStakeAmount = greenPowerInfo.allStakeAmount.minus(event.params.amount)
  greenPowerInfo.allUnstakeSum = greenPowerInfo.allUnstakeSum.plus(event.params.amount)
  greenPowerInfo.save()

  let greenPowerTx = new GreenPowerTx(event.transaction.hash.toHexString())
  greenPowerTx.typeTx = "Unstake"
  greenPowerTx.blockHash = event.block.hash.toHexString()
  greenPowerTx.txid = event.params.txid.toHexString()
  greenPowerTx.txSN = greenPowerInfo.counterTx
  greenPowerTx.greener = event.params.greener.toHexString()
  greenPowerTx.minerPower = event.params.plugMiner.toHexString()
  greenPowerTx.token = '-'
  greenPowerTx.amount = event.params.amount
  greenPowerTx.offsetBaseIndex = ZERO_BI
  greenPowerTx.timestampTx = event.block.timestamp.toU32()
  greenPowerTx.period = 0
  greenPowerTx.nonce = event.params.nonce.toU32()
  greenPowerTx.save()

  let greenPowerUser = GreenPowerUser.load(event.params.greener.toHexString())!

  greenPowerUser.unstakeTxCounter += 1
  greenPowerUser.allStakeAmount = greenPowerUser.allStakeAmount.minus(event.params.amount)
  greenPowerUser.allUnstakeSum = greenPowerUser.allUnstakeSum.plus(event.params.amount)
  if (greenPowerUser.nonce != event.params.nonce.toU32()) {
    log.warning('Nonce error: {} {}', [event.transaction.hash.toHexString(), event.params.nonce.toString()])
  }
  greenPowerUser.nonce += 1
  greenPowerUser.save()

  let greenPowerMiner = GreenPowerMiner.load(event.params.plugMiner.toHexString())!
  greenPowerMiner.unstakeTxCounter += 1
  greenPowerMiner.allStakeAmount = greenPowerMiner.allStakeAmount.minus(event.params.amount)
  greenPowerMiner.allUnstakeSum = greenPowerMiner.allUnstakeSum.plus(event.params.amount)
  greenPowerMiner.save()
}

// event Reward(address indexed txid, address indexed greener, uint256 amount, uint256 nonce);
export function handleReward(event: Reward): void {
  let greenPowerInfo = GreenPowerInfo.load("GreenPowerInfo")!
  greenPowerInfo.counterTx += 1
  greenPowerInfo.counterRewardTx += 1
  greenPowerInfo.allRewardAmount = greenPowerInfo.allRewardAmount.plus(event.params.amount)
  greenPowerInfo.save()

  let greenPowerTx = new GreenPowerTx(event.transaction.hash.toHexString())
  greenPowerTx.typeTx = "Reward"
  greenPowerTx.blockHash = event.block.hash.toHexString()
  greenPowerTx.txid = event.params.txid.toHexString()
  greenPowerTx.txSN = greenPowerInfo.counterTx
  greenPowerTx.greener = event.params.greener.toHexString()
  greenPowerTx.minerPower = "-"
  greenPowerTx.token = "-"
  greenPowerTx.amount = event.params.amount
  greenPowerTx.offsetBaseIndex = ZERO_BI
  greenPowerTx.timestampTx = event.block.timestamp.toU32()
  greenPowerTx.period = 0
  greenPowerTx.nonce = event.params.nonce.toU32()
  greenPowerTx.save()

  let greenPowerUser = GreenPowerUser.load(event.params.greener.toHexString())!
  greenPowerUser.rewardTxCounter += 1
  greenPowerUser.allRewardAmount = greenPowerUser.allRewardAmount.plus(event.params.amount)
  if (greenPowerUser.nonce != event.params.nonce.toU32()) {
    log.warning('Nonce error: {} {}', [event.transaction.hash.toHexString(), event.params.nonce.toString()])
  }
  greenPowerUser.nonce += 1
  greenPowerUser.save()

}

// event Deposit(address indexed user, address indexed token, uint256 amount);
export function handleDeposit(event: Deposit): void {
  let greenPowerInfo = GreenPowerInfo.load("GreenPowerInfo")
  if (greenPowerInfo ===null) {
    greenPowerInfo = new GreenPowerInfo("GreenPowerInfo")
    greenPowerInfo.counterTx = 0
    greenPowerInfo.counterUser = 0
    greenPowerInfo.counterMiner = 0
    greenPowerInfo.counterOffsetTx = 0
    greenPowerInfo.counterOffsetBatchTx = 0
    greenPowerInfo.counterOffsetAction = 0
    greenPowerInfo.counterStakeTx = 0
    greenPowerInfo.counterUnstakeTx = 0
    greenPowerInfo.counterRewardTx = 0

    greenPowerInfo.allOffsetAmount = ZERO_BI
    greenPowerInfo.allStakeAmount = ZERO_BI
    greenPowerInfo.allStakeSum = ZERO_BI
    greenPowerInfo.allUnstakeSum = ZERO_BI
    greenPowerInfo.allRewardAmount = ZERO_BI
    greenPowerInfo.save()
  } 
  greenPowerInfo.counterTx += 1
  greenPowerInfo.save()

  let greenPowerTx = new GreenPowerTx(event.transaction.hash.toHexString())
  greenPowerTx.typeTx = "Deposit"
  greenPowerTx.blockHash = event.block.hash.toHexString()
  greenPowerTx.txid = "-"
  greenPowerTx.txSN = greenPowerInfo.counterTx
  greenPowerTx.greener = event.params.user.toHexString()
  greenPowerTx.minerPower = "-"
  greenPowerTx.token = event.params.token.toHexString()
  greenPowerTx.amount = event.params.amount
  greenPowerTx.offsetBaseIndex = ZERO_BI
  greenPowerTx.timestampTx = event.block.timestamp.toU32()
  greenPowerTx.period = 0
  greenPowerTx.nonce = 0
  greenPowerTx.save()
}

// event Withdraw(address indexed user, address indexed token, uint256 amount)
export function handleWithdraw(event: Withdraw): void {

  let greenPowerInfo = GreenPowerInfo.load("GreenPowerInfo")!
  greenPowerInfo.counterTx += 1
  greenPowerInfo.save()

  let greenPowerTx = new GreenPowerTx(event.transaction.hash.toHexString())
  greenPowerTx.typeTx = "Withdraw"
  greenPowerTx.blockHash = event.block.hash.toHexString()
  greenPowerTx.txid = "-"
  greenPowerTx.txSN = greenPowerInfo.counterTx
  greenPowerTx.greener = event.params.user.toHexString()
  greenPowerTx.minerPower = "-"
  greenPowerTx.token = event.params.token.toHexString()
  greenPowerTx.amount = event.params.amount
  greenPowerTx.offsetBaseIndex = ZERO_BI
  greenPowerTx.timestampTx = event.block.timestamp.toU32()
  greenPowerTx.period = 0
  greenPowerTx.nonce = 0
  greenPowerTx.save()
}