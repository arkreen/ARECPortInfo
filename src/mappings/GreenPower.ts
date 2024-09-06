/* eslint-disable prefer-const */
import { BigInt, Address, Bytes, log, ethereum, ByteArray } from '@graphprotocol/graph-ts'
import { GreenPowerTx, GreenPowerInfo, GreenPowerUser, GreenPowerMiner } from '../types/schema'
import { Offset, OffsetAgent, Stake, Unstake, Reward, Deposit, Withdraw, GreenPower, AutoOffsetChanged } from '../types/GreenPower/GreenPower'
import { crypto } from "@graphprotocol/graph-ts";

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let BI_18 = BigInt.fromI32(18)

// Polygon mainnet:  1723795200   // Amoy testnet: 1723622400
export let UPGRADE_TIMESTAMP = BigInt.fromString('1723795200')     // Timestamp changing 1kWh to 0.1kWh

// (100000 * 20 * (10**8))
export const posibilitySpace = BigInt.fromString("100000").times(BigInt.fromString("20")).times(BigInt.fromString("10").pow(8))      

const GreenPower_Address = "0x12202fDD4e3501081b346C81a64b06A689237a47"

function reverseBytesArray(bytes: Bytes): Bytes {
  let reversed = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    reversed[i] = bytes[bytes.length - 1 - i];
  }
  return Bytes.fromUint8Array(reversed);
}

// Offset(address indexed txid, address indexed greener, OffsetAction[] offsetActions, address tokenToPay, uint256 stakeAmount, uint256 offsetBaseIndex, uint256 nonce);
export function handleOffset(event: Offset): void {

  let greenPowerInfo = GreenPowerInfo.load("GreenPowerInfo")
  if (greenPowerInfo ===null) {
    greenPowerInfo = new GreenPowerInfo("GreenPowerInfo")
    greenPowerInfo.counterTx = 0
    greenPowerInfo.timestampTxLast = 0
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
    greenPowerUser.allDepositSum = ZERO_BI
    greenPowerUser.allWithdrawSum = ZERO_BI
    greenPowerUser.nonce = 0
    greenPowerUser.offsetAuto = 'N'
    greenPowerUser.save()

    greenPowerInfo.counterUser += 1
    greenPowerInfo.save()
  }

  let totalOffsetAmount = ZERO_BI

  let greenPower = GreenPower.bind(Address.fromString(GreenPower_Address))
  let rewardRate = greenPower.getRewardRate(event.params.greener)

  let wonList = ''
  let wonNumer = 0 

  let posibility = posibilitySpace.div(rewardRate)                      // (100000 * 20 * (10**8)) / rewardRate;      
  if (posibilitySpace.minus(posibility.times(rewardRate)).times(BigInt.fromI32(2)).ge(rewardRate)) {
      posibility = posibility.plus(ONE_BI);
  }

  let blockHashBytes = ByteArray.fromHexString(event.block.hash.toHexString().slice(2).padStart(64,'0'))
  let greenerBytes = ByteArray.fromHexString(event.params.greener.toHexString().slice(2).padStart(64,'0'))

  let baseIndex = event.params.offsetBaseIndex
  let indexUnit = BigInt.fromString('1000000')
  if (event.block.timestamp.ge( UPGRADE_TIMESTAMP)) {
    indexUnit = BigInt.fromString('100000')
  } 

  for (let index =0; index < event.params.offsetActions.length; index++) {
    let plugMiner = event.params.offsetActions[index].plugMiner
    let offsetAmount = event.params.offsetActions[index].offsetAmount
    let plugMinerBytes = ByteArray.fromHexString(plugMiner.toHexString().slice(2).padStart(64,'0'))

    let steps = offsetAmount.div(indexUnit)
    
    for (let index = 0; index < steps.toI32(); index++ ) {
      let base = baseIndex.plus(BigInt.fromI32(index))
      let baseIndexBytes = ByteArray.fromHexString(base.toHexString().slice(2).padStart(64,'0'))         
      let luckyNumber = crypto.keccak256(plugMinerBytes.concat(greenerBytes)
                                          .concat(baseIndexBytes).concat(blockHashBytes))

      let luckyBN = BigInt.fromUnsignedBytes(reverseBytesArray(Bytes.fromByteArray(luckyNumber)));   
      
      if (luckyBN.mod(posibility).lt(BigInt.fromString("100000"))) {
        if (wonList != '') wonList = wonList + ','
        wonList = wonList + baseIndex.plus(BigInt.fromI32(index)).toString()
        wonNumer += 1
      }
    }

    baseIndex = baseIndex.plus(steps)
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
  greenPowerInfo.timestampTxLast = event.block.timestamp.toU32()
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
  greenPowerTx.minerPower = totalOffsetAmount.toString()
  greenPowerTx.token = event.params.tokenToPay.toHexString()
  greenPowerTx.amount = event.params.stakeAmount
  greenPowerTx.offsetBaseIndex = event.params.offsetBaseIndex
  greenPowerTx.timestampTx = event.block.timestamp.toU32()
  greenPowerTx.wonList = wonList
  greenPowerTx.data = event.params.txid.toHexString() + '-' + event.params.offsetBaseIndex.toString()
  
  let steps = totalOffsetAmount.div(indexUnit)            // used to save steps
  greenPowerTx.period = steps.toI32()
  greenPowerTx.nonce = event.params.nonce.toU32()
  greenPowerTx.save()
}

// event OffsetAgent(address indexed txid, uint256 baseIndex, uint256 steps)
export function handleOffsetAgent(event: OffsetAgent): void {

  let greenPowerInfo = GreenPowerInfo.load("GreenPowerInfo")
  if (greenPowerInfo ===null) {
    greenPowerInfo = new GreenPowerInfo("GreenPowerInfo")
    greenPowerInfo.counterTx = 0
    greenPowerInfo.timestampTxLast = 0
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

  // offsetPowerAgent(address txid, OffsetActionAgent[] calldata offsetActions)
  const typestring = '(address,(address,address,uint256)[])';
  const input = '0x0000000000000000000000000000000000000000000000000000000000000020'
                    + event.transaction.input.toHexString().slice(10)
  
  const callData = ethereum.decode(typestring, Bytes.fromByteArray(Bytes.fromHexString(input)))!;
  const offsetActions = callData.toTuple()[1].toArray()

  let totalOffsetAmount = ZERO_BI
  let baseIndex = event.params.baseIndex

  // struct OffsetActionAgent {address greener; address plugMiner; uint256 offsetAmount}  
  for (let index =0; index < offsetActions.length; index++) {
    const offsetAction = offsetActions[index].toTuple()
    const greener = offsetAction[0].toAddress()
    const plugMiner = offsetAction[1].toAddress()
    const offsetAmount = offsetAction[2].toBigInt()

    totalOffsetAmount = totalOffsetAmount.plus(offsetAmount)
    
    let greenPowerUser = GreenPowerUser.load(greener.toHexString())
    if (greenPowerUser ===null) {
      greenPowerUser = new GreenPowerUser(greener.toHexString())
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
      greenPowerUser.allDepositSum = ZERO_BI
      greenPowerUser.allWithdrawSum = ZERO_BI
      greenPowerUser.offsetAuto = 'N'
      greenPowerUser.nonce = 0
      greenPowerUser.save()

      greenPowerInfo.counterUser += 1
      greenPowerInfo.save()
    }

    greenPowerUser.offsetActionCounter += 1
    greenPowerUser.offsetTxCounter += 1
    greenPowerUser.allOffsetAmount = greenPowerUser.allOffsetAmount.plus(offsetAmount)
    greenPowerUser.save()

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

    baseIndex = baseIndex.plus(offsetAmount.div(BigInt.fromString('10').pow(5)))
  }

  greenPowerInfo.counterTx += 1
  greenPowerInfo.timestampTxLast = event.block.timestamp.toU32()
  greenPowerInfo.counterOffsetAction += offsetActions.length
  greenPowerInfo.allOffsetAmount = greenPowerInfo.allOffsetAmount.plus(totalOffsetAmount)
  greenPowerInfo.counterOffsetTx += 1
  greenPowerInfo.save()

  let greenPowerTx = new GreenPowerTx(event.transaction.hash.toHexString())
  greenPowerTx.typeTx = "OffsetAgent"
  greenPowerTx.blockHash = event.block.hash.toHexString()
  greenPowerTx.txid = event.params.txid.toHexString()
  greenPowerTx.txSN = greenPowerInfo.counterTx
  greenPowerTx.greener = offsetActions[0].toTuple()[0].toAddress().toHexString()    // put first address
  greenPowerTx.minerPower = '-'
  greenPowerTx.token = 'ART'
  greenPowerTx.amount = totalOffsetAmount
  greenPowerTx.offsetBaseIndex = baseIndex
  greenPowerTx.timestampTx = event.block.timestamp.toU32()
  greenPowerTx.data = event.params.txid.toHexString() + '-' + event.params.baseIndex.toString()
  greenPowerTx.period = 0
  greenPowerTx.nonce = 0
  greenPowerTx.save()

}

// event Stake(address indexed txid, address indexed greener, address plugMiner, uint256 amount, uint256 period, uint256 nonce);
export function handleStake(event: Stake): void {

  let greenPowerInfo = GreenPowerInfo.load("GreenPowerInfo")
  if (greenPowerInfo ===null) {
    greenPowerInfo = new GreenPowerInfo("GreenPowerInfo")
    greenPowerInfo.counterTx = 0
    greenPowerInfo.timestampTxLast = 0
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
    greenPowerUser.allDepositSum = ZERO_BI
    greenPowerUser.allWithdrawSum = ZERO_BI
    greenPowerUser.nonce = 0
    greenPowerUser.offsetAuto = 'N'
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
  greenPowerInfo.timestampTxLast = event.block.timestamp.toU32()
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
  greenPowerTx.data = greenPowerTx.txid + '-' + greenPowerTx.greener + '-' + greenPowerTx.minerPower + '-'
                      + greenPowerTx.amount.toString() + '-' 
                      + event.params.period.toString() + '-' + event.params.nonce.toString()

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
  greenPowerInfo.timestampTxLast = event.block.timestamp.toU32()
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
  greenPowerTx.data = greenPowerTx.txid + '-' + greenPowerTx.greener + '-' + greenPowerTx.minerPower + '-'
                      + greenPowerTx.amount.toString() + '-' + event.params.nonce.toString()

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
  greenPowerInfo.timestampTxLast = event.block.timestamp.toU32()
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
  greenPowerTx.data = greenPowerTx.txid + '-' + greenPowerTx.greener + '-'
                      + greenPowerTx.amount.toString() + '-' + event.params.nonce.toString()

  greenPowerTx.period = 0
  greenPowerTx.nonce = event.params.nonce.toU32()
  greenPowerTx.save()

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
    greenPowerUser.allDepositSum = ZERO_BI
    greenPowerUser.allWithdrawSum = ZERO_BI
    greenPowerUser.nonce = 0
    greenPowerUser.offsetAuto = 'N'
    greenPowerUser.save()

    greenPowerInfo.counterUser += 1
    greenPowerInfo.save()
  }

  greenPowerUser.rewardTxCounter += 1
  greenPowerUser.allRewardAmount = greenPowerUser.allRewardAmount.plus(event.params.amount)
  if (greenPowerUser.nonce != event.params.nonce.toU32()) {
    log.warning('Nonce error: {} {}', [event.transaction.hash.toHexString(), event.params.nonce.toString()])
  }
  greenPowerUser.nonce += 1
  greenPowerUser.save()

}

// event Deposit(address indexed user, address tokenToPay, uint256 amount, uint256 amountART);
export function handleDeposit(event: Deposit): void {
  let greenPowerInfo = GreenPowerInfo.load("GreenPowerInfo")
  if (greenPowerInfo ===null) {
    greenPowerInfo = new GreenPowerInfo("GreenPowerInfo")
    greenPowerInfo.counterTx = 0
    greenPowerInfo.timestampTxLast = 0
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
  greenPowerInfo.timestampTxLast = event.block.timestamp.toU32()
  greenPowerInfo.save()

  let greenPowerTx = new GreenPowerTx(event.transaction.hash.toHexString())
  greenPowerTx.typeTx = "Deposit"
  greenPowerTx.blockHash = event.block.hash.toHexString()
  greenPowerTx.txid = "-"
  greenPowerTx.txSN = greenPowerInfo.counterTx
  greenPowerTx.greener = event.params.user.toHexString()
  greenPowerTx.minerPower = "-"
  greenPowerTx.token = event.params.tokenToPay.toHexString()
  greenPowerTx.amount = event.params.amount
  greenPowerTx.offsetBaseIndex = ZERO_BI
  greenPowerTx.timestampTx = event.block.timestamp.toU32()
  greenPowerTx.data = event.params.user.toHexString() + '-' 
                      + event.params.tokenToPay.toHexString() + '-' 
                      + event.params.amount.toString() + '-'
                      + event.params.amountART.toString()

  greenPowerTx.period = 0
  greenPowerTx.nonce = 0
  greenPowerTx.save()

  let greenPowerUser = GreenPowerUser.load(event.params.user.toHexString())
  if (greenPowerUser ===null) {
    greenPowerUser = new GreenPowerUser(event.params.user.toHexString())
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
    greenPowerUser.allDepositSum = ZERO_BI
    greenPowerUser.allWithdrawSum = ZERO_BI
    greenPowerUser.offsetAuto = 'N'
    greenPowerUser.nonce = 0
    greenPowerUser.save()

    greenPowerInfo.counterUser += 1
    greenPowerInfo.save()
  }

  greenPowerUser.allDepositSum = greenPowerUser.allDepositSum.plus(event.params.amountART)
  greenPowerUser.save()

}

// event Withdraw(address indexed user, uint256 amountART)
export function handleWithdraw(event: Withdraw): void {

  let greenPowerInfo = GreenPowerInfo.load("GreenPowerInfo")!
  greenPowerInfo.counterTx += 1
  greenPowerInfo.timestampTxLast = event.block.timestamp.toU32()
  greenPowerInfo.save()

  let greenPowerTx = new GreenPowerTx(event.transaction.hash.toHexString())
  greenPowerTx.typeTx = "Withdraw"
  greenPowerTx.blockHash = '-'
  greenPowerTx.txid = "-"
  greenPowerTx.txSN = greenPowerInfo.counterTx
  greenPowerTx.greener = event.params.user.toHexString()
  greenPowerTx.minerPower = "-"
  greenPowerTx.token = 'ART'
  greenPowerTx.amount = event.params.amountART
  greenPowerTx.offsetBaseIndex = ZERO_BI
  greenPowerTx.timestampTx = event.block.timestamp.toU32()
  greenPowerTx.data = event.params.user.toHexString() + '-' + event.params.amountART.toString()
  greenPowerTx.period = 0
  greenPowerTx.nonce = 0

  greenPowerTx.save()

  let greenPowerUser = GreenPowerUser.load(event.params.user.toHexString())!
  greenPowerUser.allWithdrawSum = greenPowerUser.allWithdrawSum.plus(event.params.amountART)
  greenPowerUser.save()
}

// event AutoOffsetChanged(address indexed user, bool ifAuto);
export function handleAutoOffsetChanged(event: AutoOffsetChanged): void {
  let greenPowerInfo = GreenPowerInfo.load("GreenPowerInfo")!
  greenPowerInfo.counterTx += 1
  greenPowerInfo.timestampTxLast = event.block.timestamp.toU32()
  greenPowerInfo.save()

  let greenPowerTx = new GreenPowerTx(event.transaction.hash.toHexString())
  greenPowerTx.typeTx = "AutoOffsetChanged"
  greenPowerTx.blockHash = '-'
  greenPowerTx.txid = "-"
  greenPowerTx.txSN = greenPowerInfo.counterTx
  greenPowerTx.greener = event.params.user.toHexString()
  greenPowerTx.minerPower = "-"
  greenPowerTx.token = '-'
  greenPowerTx.amount = ZERO_BI
  greenPowerTx.offsetBaseIndex = ZERO_BI
  greenPowerTx.timestampTx = event.block.timestamp.toU32()
  greenPowerTx.data = event.params.user.toHexString() + '-' + event.params.ifAuto.toString()
  greenPowerTx.period = 0
  greenPowerTx.nonce = 0

  greenPowerTx.save()

  let greenPowerUser = GreenPowerUser.load(event.params.user.toHexString())
  if (greenPowerUser ===null) {
    greenPowerUser = new GreenPowerUser(event.params.user.toHexString())
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
    greenPowerUser.allDepositSum = ZERO_BI
    greenPowerUser.allWithdrawSum = ZERO_BI
    greenPowerUser.offsetAuto = 'N'
    greenPowerUser.nonce = 0
    greenPowerUser.save()

    greenPowerInfo.counterUser += 1
    greenPowerInfo.save()
  }

  if(event.params.ifAuto) {
    greenPowerUser.offsetAuto = 'Y'
  }
  greenPowerUser.save()
}
