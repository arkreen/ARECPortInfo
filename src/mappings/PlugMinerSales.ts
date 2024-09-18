/* eslint-disable prefer-const */
import { BigInt, Address, log, ethereum, Bytes } from '@graphprotocol/graph-ts'
import { PlugOverview, PlugMinerTx, TokenOverview } from '../types/schema'
import { ActionPlugMiner, Deposit, Remove, Withdraw } from '../types/PlugMinerSales/PlugMinerSales'

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let BI_18 = BigInt.fromI32(18)

// ActionPlugMiner(address indexed txid, address indexed user, bytes32 actionType, uint256 action, uint256 number);
export function handlePlugMiner(event: ActionPlugMiner): void {

  let plugOverview = PlugOverview.load("PlugOverview")
  if (plugOverview ===null) {
    plugOverview = new PlugOverview("PlugOverview")
    plugOverview.numBuyTx = 0
    plugOverview.totalMinersBought = 0
    plugOverview.numRefundTx = 0
    plugOverview.totalMinersBurned = 0
    plugOverview.save()
  } 

  //actionPlugMiner(address txid, ActionInfo calldata actionInfo, uint256 nonce, uint256 deadline, Sig calldata signature)
  const typestring = '(address,(address,address,uint256,address,uint256,bytes32,uint256),uint256,uint256,(uint8,bytes32,bytes32))';
  const input = '0x0000000000000000000000000000000000000000000000000000000000000020'
                  + event.transaction.input.toHexString().slice(10)

  const callData = ethereum.decode(typestring, Bytes.fromByteArray(Bytes.fromHexString(input)))!;
  const decodedCallData = callData.toTuple()
  const actionInfo = decodedCallData[1].toTuple()

  let plugMinerTx = new PlugMinerTx(event.params.txid.toHexString())
  plugMinerTx.hashTx = event.transaction.hash.toHexString()
  plugMinerTx.owner = event.params.user.toHexString()

  plugMinerTx.tokenPay = actionInfo[1].toAddress().toHexString()
  plugMinerTx.amountPay = actionInfo[2].toBigInt()
  plugMinerTx.tokenGet = actionInfo[3].toAddress().toHexString()
  plugMinerTx.amountGet = actionInfo[4].toBigInt()
  plugMinerTx.actionType = event.params.actionType.toHexString()
  plugMinerTx.buyOrRefund = (event.params.action.toI32() == 1) ? "Buy" : "Refund"
  plugMinerTx.quantity = event.params.number.toI32()
  plugMinerTx.save()

  let tokenOverviewPay  = TokenOverview.load( plugMinerTx.tokenPay)
  if (tokenOverviewPay == null) {
    tokenOverviewPay  = new TokenOverview( plugMinerTx.tokenPay)
    tokenOverviewPay.allbought = ZERO_BI
    tokenOverviewPay.allWithdrawn = ZERO_BI
    tokenOverviewPay.alldeposited = ZERO_BI
    tokenOverviewPay.allRewarded = ZERO_BI
    tokenOverviewPay.save()
  }
  tokenOverviewPay.allbought = tokenOverviewPay.allbought.plus(plugMinerTx.amountPay)
  tokenOverviewPay.save()
  
  let tokenOverviewGet  = TokenOverview.load(plugMinerTx.tokenGet)
  if (tokenOverviewGet == null) {
    tokenOverviewGet  = new TokenOverview( plugMinerTx.tokenPay)
    tokenOverviewGet.allbought = ZERO_BI
    tokenOverviewGet.allWithdrawn = ZERO_BI
    tokenOverviewGet.alldeposited = ZERO_BI
    tokenOverviewGet.allRewarded = ZERO_BI
    tokenOverviewGet.save()
  }
  tokenOverviewGet.allRewarded = tokenOverviewGet.allRewarded.plus(plugMinerTx.amountGet)
  tokenOverviewGet.save()

  if (event.params.action.toI32() == 1) {
    plugOverview.numBuyTx += 1
    plugOverview.totalMinersBought += event.params.number.toI32()
    plugOverview.save()
  } else if (event.params.action.toI32() == 2) {
    plugOverview.numRefundTx += 1 
    plugOverview.totalMinersBurned += event.params.number.toI32()
    plugOverview.save()
  }
}

// Deposit(indexed address,uint256)
export function handleDeposit(event: Deposit): void {
  let tokenOverview  = TokenOverview.load(event.params.token.toHexString())!
  tokenOverview.alldeposited = tokenOverview.alldeposited.plus(event.params.amount)
  tokenOverview.save()
}

// Remove(indexed address,uint256)
export function handleRemove(event: Remove): void {
  let tokenOverview  = TokenOverview.load(event.params.token.toHexString())!
  tokenOverview.allRewarded = tokenOverview.allRewarded.plus(event.params.amount)
  tokenOverview.save()
}

// Withdraw(indexed address,uint256)
export function handleWithdraw(event: Withdraw): void {
  let tokenOverview  = TokenOverview.load(event.params.token.toHexString())!
  tokenOverview.allWithdrawn = tokenOverview.allWithdrawn.plus(event.params.amount)
  tokenOverview.save()
}