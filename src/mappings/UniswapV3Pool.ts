/* eslint-disable prefer-const */
import { BigInt, Address, log, BigDecimal } from '@graphprotocol/graph-ts'
import { PoolAKREUsdc, PoolPosition, IncreaseInfo, DecreaseInfo, CollectInfo, MarketMakerPool} from '../types/schema'
import { Mint, Burn, Initialize} from '../types/UniswapV3Pool/UniswapV3Pool'

import { IncreaseLiquidity, DecreaseLiquidity, Collect, UniV3PositionManager} from '../types/UniV3PositionManager/UniV3PositionManager'

import { crypto, ByteArray, Bytes } from "@graphprotocol/graph-ts";

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let BI_18 = BigInt.fromI32(18)
export let ZERO_BD = BigDecimal.fromString('0')
export let ONE_BD = BigDecimal.fromString('1')

const poolAKREUSDCAddress = '0x65906DBDfCA73c67CF35744864d2f3f9F71a8c44'                    // Polygon mainnet
const addressAKRE = '0xe9c21de62c5c5d0ceacce2762bf655afdceb7ab3'                            // AKRE (amount1)
const addressUSDC = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'                            // USDC (amount0)
const addressUniTool = '0x97a49d1e92ce71477e8aaece475006d2d6503ec6'                         // USDC
const addressUniV3PositionManager = '0xc36442b4a4522e871399cd717abdd847ab11fe88'            // UniV3PositionManager

export function bigDecimalExp6(): BigDecimal {
  return BigDecimal.fromString('1000000')
}

export function bigDecimalExp18(): BigDecimal {
  return BigDecimal.fromString('1000000000000000000')
}

export function expandTo18Decimals(base: i32): BigInt {
  return BigInt.fromString('1000000000000000000').times(BigInt.fromI32(base))
}

export function convertToPriceInNumber(priceX96: BigInt): BigDecimal {
  // Price = (2**192) * (10**18) * (10**18)  /  (10**6)  / (sqrtPriceX96**2)  asssuming Token0 = USDC, Token1 = Token, Precision = 18 
  //          X96,  Token Decimal, Precision, USDC Decimal,   Price in sqrtPriceX96
  const priceInBigNumber = BigInt.fromI32(2).pow(192).times(expandTo18Decimals(1)).times(expandTo18Decimals(1))
                            .div(BigInt.fromI32(10).pow(6)).div(priceX96.times(priceX96))

  const priceInNumber = BigDecimal.fromString(priceInBigNumber.toString()).div(bigDecimalExp18()) 
  return priceInNumber
}

// Initialize(uint160 sqrtPriceX96, int24 tick)
export function handleInitialize(event: Initialize): void {

  let poolAKREUsdc = PoolAKREUsdc.load("AKRE_USDCE")
  if (poolAKREUsdc === null) {
    poolAKREUsdc = new PoolAKREUsdc("AKRE_USDCE")
    poolAKREUsdc.token0 = addressUSDC
    poolAKREUsdc.token1 = addressAKRE
    poolAKREUsdc.pool = poolAKREUSDCAddress
    poolAKREUsdc.fee = 3000
    poolAKREUsdc.tickSpacing = 60
    poolAKREUsdc.sqrtPriceX96 = ZERO_BI
    poolAKREUsdc.tickInit = 0
    poolAKREUsdc.priceInit = ZERO_BD
    poolAKREUsdc.lastMintTrx = ""
    poolAKREUsdc.lastBurnTrx = ""
    poolAKREUsdc.tickLower = 0
    poolAKREUsdc.tickUpper = 0
    poolAKREUsdc.liquidity = ZERO_BI
    poolAKREUsdc.amount0 = ZERO_BI
    poolAKREUsdc.amount1 = ZERO_BI
    poolAKREUsdc.save()
  }
  poolAKREUsdc.sqrtPriceX96 = event.params.sqrtPriceX96
  poolAKREUsdc.tickInit = event.params.tick
  poolAKREUsdc.priceInit = convertToPriceInNumber(event.params.sqrtPriceX96)

  poolAKREUsdc.save()
}

// Mint(address sender, indexed address owner, indexed int24 tickLower, indexed int24 tickUpper, 
//      uint128 amount, uint256 amount0, uint256 amount1)
export function handlMint(event: Mint): void {

  let poolAKREUsdc = PoolAKREUsdc.load("AKRE_USDCE")!
  poolAKREUsdc.lastMintTrx = event.transaction.hash.toHexString()
  poolAKREUsdc.tickLower = event.params.tickLower
  poolAKREUsdc.tickUpper = event.params.tickUpper

  poolAKREUsdc.liquidity = event.params.amount
  poolAKREUsdc.amount0 = event.params.amount0
  poolAKREUsdc.amount1 = event.params.amount1
  poolAKREUsdc.save()
}

// Burn(indexed address owner, indexed int24 tickLower, indexed int24 tickUpper, 
//      uint128 amount, uint256 amount0, uint256 amount1)
export function handlBurn(event: Burn): void {
  let poolAKREUsdc = PoolAKREUsdc.load("AKRE_USDCE")!
  poolAKREUsdc.lastBurnTrx = event.transaction.hash.toHexString()
  poolAKREUsdc.tickLower = event.params.tickLower
  poolAKREUsdc.tickUpper = event.params.tickUpper

  poolAKREUsdc.liquidity = event.params.amount
  poolAKREUsdc.amount0 = event.params.amount0
  poolAKREUsdc.amount1 = event.params.amount1
  poolAKREUsdc.save()
}

// IncreaseLiquidity(indexed uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
export function handleIncreaseLiquidity(event: IncreaseLiquidity): void {
  let poolAKREUsdc = PoolAKREUsdc.load("AKRE_USDCE")!

  let poolPosition =  PoolPosition.load(event.params.tokenId.toString())
  if (poolPosition == null) {
    if (poolAKREUsdc.lastMintTrx != event.transaction.hash.toHexString()) {
      log.warning('Different transcation: {}, {}', [poolAKREUsdc.lastMintTrx, event.transaction.hash.toHexString()])
    }

    poolPosition = new PoolPosition(event.params.tokenId.toString())
    let uniV3PositionManager = UniV3PositionManager.bind(Address.fromString(addressUniV3PositionManager))
    poolPosition.owner = uniV3PositionManager.ownerOf(event.params.tokenId).toHexString()
    poolPosition.trxCreation = poolAKREUsdc.lastMintTrx
    poolPosition.tickLower = poolAKREUsdc.tickLower
    poolPosition.tickUpper = poolAKREUsdc.tickUpper
    poolPosition.addTimes = 0
    poolPosition.decreasetTimes = 0
    poolPosition.collectTimes = 0
    poolPosition.liquidityNet = ZERO_BI
    poolPosition.liquidityAdd = ZERO_BI
    poolPosition.liquidityDecrease = ZERO_BI

    poolPosition.amount0Add = ZERO_BD
    poolPosition.amount1Add = ZERO_BD
    poolPosition.amount0Collect = ZERO_BD
    poolPosition.amount1Collect = ZERO_BD

    poolPosition.save()

    let marketMakerPool = MarketMakerPool.load(event.transaction.from.toHexString())
    if (marketMakerPool == null) {
      marketMakerPool = new MarketMakerPool(event.transaction.from.toHexString())
      marketMakerPool.numPosition = 1
      marketMakerPool.numAdd = 0
      marketMakerPool.numDecrease = 0
      marketMakerPool.numCollet = 0
      marketMakerPool.save()
    }
    marketMakerPool.numPosition  += 1
    marketMakerPool.save()
  }

  let marketMakerPool = MarketMakerPool.load(event.transaction.from.toHexString())!
  marketMakerPool.numAdd += 1
  marketMakerPool.save()

  let increaseInfo = new IncreaseInfo(event.transaction.hash.toHexString())
  increaseInfo.sender = event.transaction.from.toHexString()
  increaseInfo.tokenId = event.params.tokenId.toI32()

  increaseInfo.liquidity = event.params.liquidity
  increaseInfo.amount0 = BigDecimal.fromString(event.params.amount0.toString()).div(bigDecimalExp6())
  increaseInfo.amount1 = BigDecimal.fromString(event.params.amount1.toString()).div(bigDecimalExp18())
  increaseInfo.save()

  poolPosition.addTimes += 1
  poolPosition.liquidityAdd = poolPosition.liquidityAdd.plus(event.params.liquidity)
  poolPosition.liquidityNet = poolPosition.liquidityNet.plus(event.params.liquidity)
  poolPosition.amount0Add = poolPosition.amount0Add.plus(increaseInfo.amount0)
  poolPosition.amount1Add = poolPosition.amount1Add.plus(increaseInfo.amount1)
  poolPosition.save()

}

// DecreaseLiquidity (indexed uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
export function handleDecreaseLiquidity(event: DecreaseLiquidity): void {

  let decreaseInfo = new DecreaseInfo(event.transaction.hash.toHexString())
  decreaseInfo.sender = event.transaction.from.toHexString()
  decreaseInfo.tokenId = event.params.tokenId.toI32()

  decreaseInfo.liquidity = event.params.liquidity
  decreaseInfo.amount0 = BigDecimal.fromString(event.params.amount0.toString()).div(bigDecimalExp6())
  decreaseInfo.amount1 = BigDecimal.fromString(event.params.amount1.toString()).div(bigDecimalExp18())
  decreaseInfo.save()

  let marketMakerPool = MarketMakerPool.load(event.transaction.from.toHexString())!
  marketMakerPool.numDecrease += 1
  marketMakerPool.save()

  let poolPosition =  PoolPosition.load(event.params.tokenId.toString())!
  poolPosition.decreasetTimes += 1
  poolPosition.liquidityDecrease = poolPosition.liquidityDecrease.plus(event.params.liquidity)
  poolPosition.liquidityNet = poolPosition.liquidityNet.minus(event.params.liquidity)
  poolPosition.save()

}

// Collect(indexed uint256 tokenId, address recipient, uint256 amount0, uint256 amount1)
export function handlCollect(event: Collect): void {

  let collectInfo = new CollectInfo(event.transaction.hash.toHexString())
  collectInfo.receiver = event.params.recipient.toHexString()
  collectInfo.tokenId = event.params.tokenId.toI32()
  collectInfo.amount0 = BigDecimal.fromString(event.params.amount0.toString()).div(bigDecimalExp6())
  collectInfo.amount1 = BigDecimal.fromString(event.params.amount1.toString()).div(bigDecimalExp18())
  collectInfo.save()

  let marketMakerPool = MarketMakerPool.load(event.transaction.from.toHexString())!
  marketMakerPool.numCollet += 1
  marketMakerPool.save()

  let poolPosition =  PoolPosition.load(event.params.tokenId.toString())!
  poolPosition.collectTimes += 1
  poolPosition.amount0Collect = poolPosition.amount0Collect.plus(collectInfo.amount0)
  poolPosition.amount1Collect = poolPosition.amount1Collect.plus(collectInfo.amount1)
  poolPosition.save()

}