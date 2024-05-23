/* eslint-disable prefer-const */
import { BigInt, BigDecimal, log, Address } from '@graphprotocol/graph-ts'
import { ARECBank as ARECBankType, ARTToken as ARTTokenType, ARTTokenSale as ARTTokenSaleType, Token } from '../types/schema'

import { ARTPriceChanged, ARTSold, Withdraw, Deposit, ArkreenRECBank } from '../types/ArkreenRECBank/ArkreenRECBank'
import { fetchTokenSymbol, fetchTokenName, fetchTokenDecimals, fetchTokenTotalSupply } from './helpers'

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let ZERO_BD = BigDecimal.fromString('0')
export let ONE_BD = BigDecimal.fromString('1')
export let BI_18 = BigInt.fromI32(18)

const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
const ADDRESS_NATIVE = '0x9c3c9283d3e44854697cd22d3faa240cfb032889'
const ADDRESS_BANK = '0x7ee6d2a14d6db71339a010d44793b27895b36d50'       // Simu env
const BLOCK_HEIGHT_SYNC = BigInt.fromI32(36548131)                      // Block height to sync price and deposit

export function handleARTPriceChanged(event: ARTPriceChanged): void {
  // event ARTPriceChanged(address indexed artToken, address indexed payToken, uint256 newPrice);    
  let artTokenAddress = event.params.artToken.toHexString()
  let payTokenAddress = event.params.payToken.toHexString()
  let ARTTokenSalesID = artTokenAddress + '-' + payTokenAddress

  let ARECBank = ARECBankType.load('ARECBank')
  if (ARECBank === null) {
    ARECBank = new ARECBankType('ARECBank')
    ARECBank.numARTTokens = 0
    ARECBank.ARTTokens = []
  }

  ARECBank.timeTrx = event.block.timestamp.toString()
  ARECBank.blockHeight = event.block.number.toString()
  ARECBank.save()

  let ARTToken = ARTTokenType.load('ART-' + artTokenAddress)
  if (ARTToken === null) {
    ARTToken = new ARTTokenType('ART-' + artTokenAddress)
    ARTToken.numPaymentToken = 0
    ARTToken.totalAmountDeposit = ZERO_BI
    ARTToken.totalAmountSold = ZERO_BI
    ARTToken.paymentTokens = []
    ARTToken.save()

    let ARTTokens = ARECBank.ARTTokens
    ARECBank.numARTTokens = ARECBank.numARTTokens + 1
    ARTTokens.push(event.params.artToken)
    ARECBank.ARTTokens = ARTTokens
    ARECBank.save()

    let artToken = new Token(artTokenAddress)
    artToken.symbol = fetchTokenSymbol(event.params.artToken)
    artToken.name = fetchTokenName(event.params.artToken)
    artToken.decimals = fetchTokenDecimals(event.params.artToken)
    artToken.totalSupply = fetchTokenTotalSupply(event.params.artToken)
    artToken.save()
  }

  let ARTTokenSale = ARTTokenSaleType.load(ARTTokenSalesID)
  if (ARTTokenSale === null) {
    ARTTokenSale = new ARTTokenSaleType(ARTTokenSalesID)
    ARTTokenSale.salePrices = ZERO_BI
    ARTTokenSale.timesOfSale = ZERO_BI
    ARTTokenSale.saleIncomes = ZERO_BI
    ARTTokenSale.withdrawValues = ZERO_BI
    ARTTokenSale.save()

    let paymentTokens = ARTToken.paymentTokens
    ARTToken.numPaymentToken = ARTToken.numPaymentToken + 1
    paymentTokens.push(event.params.payToken)
    ARTToken.paymentTokens = paymentTokens
    ARTToken.save()

    let paymentToken = new Token(payTokenAddress)
    paymentToken.symbol = fetchTokenSymbol(event.params.payToken)
    paymentToken.name = fetchTokenName(event.params.payToken)
    paymentToken.decimals = fetchTokenDecimals(event.params.payToken)
    paymentToken.totalSupply = fetchTokenTotalSupply(event.params.payToken)
    paymentToken.save()
  }
 
  ARTTokenSale.salePrices = event.params.newPrice
  ARTTokenSale.save()
}

export function handleARTSold(event: ARTSold): void {
  // event ARTSold(address indexed artToken, address indexed payToken, uint256 artAmount, uint256 payAmount);
  // log.warning('ART Sold: {} {} {} {} {}', [event.transaction.hash.toHexString(), event.params.artToken.toHexString(), event.params.payToken.toHexString(), 
  //    event.params.artAmount.toString(), event.params.payAmount.toString()])

  let artTokenAddress = event.params.artToken.toHexString()
  let payTokenAddress = event.params.payToken.toHexString()
  let ARTTokenSalesID = artTokenAddress + '-' + payTokenAddress

  let ARECBank = ARECBankType.load('ARECBank')
  if (ARECBank === null) {
    ARECBank = new ARECBankType('ARECBank')
    ARECBank.numARTTokens = 0
    ARECBank.ARTTokens = []
  }
  
  ARECBank.timeTrx = event.block.timestamp.toString()
  ARECBank.blockHeight = event.block.number.toString()
  ARECBank.save()

  // To be compliant with early version only with ARTSold event
  let ARTToken = ARTTokenType.load('ART-' + artTokenAddress)
  if (ARTToken === null) {
    ARTToken = new ARTTokenType('ART-' + artTokenAddress)
    ARTToken.numPaymentToken = 0
    ARTToken.totalAmountDeposit = ZERO_BI
    ARTToken.totalAmountSold = ZERO_BI
    ARTToken.paymentTokens = []
    ARTToken.save()

    // Create ART token
    let ARTTokens = ARECBank.ARTTokens
    ARECBank.numARTTokens = ARECBank.numARTTokens + 1
    ARTTokens.push(event.params.artToken)
    ARECBank.ARTTokens = ARTTokens
    ARECBank.save()

    // Creat ART Token basic info
    let artToken = new Token(artTokenAddress)
    artToken.symbol = fetchTokenSymbol(event.params.artToken)
    artToken.name = fetchTokenName(event.params.artToken)
    artToken.decimals = fetchTokenDecimals(event.params.artToken)
    artToken.totalSupply = fetchTokenTotalSupply(event.params.artToken)
    artToken.save()
  }
  
  let paymentToken = Token.load(payTokenAddress)
  if (paymentToken === null) {
    let paymentTokens = ARTToken.paymentTokens
    ARTToken.numPaymentToken = ARTToken.numPaymentToken + 1
    paymentTokens.push(event.params.payToken)
    ARTToken.paymentTokens = paymentTokens
    ARTToken.save()

    let paymentToken = new Token(payTokenAddress)
    paymentToken.symbol = fetchTokenSymbol(event.params.payToken)
    paymentToken.name = fetchTokenName(event.params.payToken)
    paymentToken.decimals = fetchTokenDecimals(event.params.payToken)
    paymentToken.totalSupply = fetchTokenTotalSupply(event.params.payToken)
    paymentToken.save()
  }

  let ARTTokenSale = ARTTokenSaleType.load(ARTTokenSalesID)
  if (ARTTokenSale === null) {
    ARTTokenSale = new ARTTokenSaleType(ARTTokenSalesID)
    ARTTokenSale.salePrices = ZERO_BI
    ARTTokenSale.timesOfSale = ZERO_BI    
    ARTTokenSale.saleIncomes = ZERO_BI
    ARTTokenSale.withdrawValues = ZERO_BI
    ARTTokenSale.save()
  }

  ARTToken.totalAmountSold = ARTToken.totalAmountSold.plus(event.params.artAmount)
  ARTToken.save()

  ARTTokenSale.saleIncomes = ARTTokenSale.saleIncomes.plus(event.params.payAmount)
  ARTTokenSale.timesOfSale = ARTTokenSale.timesOfSale.plus(ONE_BI)
  ARTTokenSale.save()

  // for simu and mainnet, PriceChanged event
  if (ARTTokenSale.salePrices.equals(ZERO_BI)) {
    let arkreenRECBank = ArkreenRECBank.bind(Address.fromString(ADDRESS_BANK))
    let saleIncome = arkreenRECBank.try_saleIncome(event.params.artToken, event.params.payToken)
    if (!saleIncome.reverted) {
      ARTTokenSale.salePrices = saleIncome.value.value0
      ARTTokenSale.save()
    }
  }

  if (ARTToken.totalAmountDeposit.equals(ZERO_BI) && event.block.number.equals(BLOCK_HEIGHT_SYNC)) {
    let arkreenRECBank = ArkreenRECBank.bind(Address.fromString(ADDRESS_BANK))
    let artSaleInfo = arkreenRECBank.try_artSaleInfo(event.params.artToken)
    if (!artSaleInfo.reverted) {
      ARTToken.totalAmountDeposit = artSaleInfo.value.value2
      ARTToken.save()
    }
  }
}

export function handleWithdraw(event: Withdraw): void {
  // event Withdraw(address indexed artToken, address indexed payToken, uint256 balance);  
  let artTokenAddress = event.params.artToken.toHexString()
  let payTokenAddress = event.params.payToken.toHexString()
  let ARTTokenSalesID = artTokenAddress + '-' + payTokenAddress

  let ARTToken = ARTTokenType.load('ART-' + artTokenAddress)
  let ARTTokenSale = ARTTokenSaleType.load(ARTTokenSalesID)

  if((ARTToken === null) || (ARTTokenSale === null)) {
    log.error('ART Token not found: {} {} {}', [event.params.artToken.toHexString(), event.params.payToken.toHexString(), event.params.balance.toString()])
    return
  }

  ARTTokenSale.withdrawValues = ARTTokenSale.withdrawValues.plus(event.params.balance)
  ARTTokenSale.save()
  
  let ARECBank = ARECBankType.load('ARECBank')!
  ARECBank.timeTrx = event.block.timestamp.toString()
  ARECBank.blockHeight = event.block.number.toString()
  ARECBank.save()
}

export function handleDeposit(event: Deposit): void {
  // event Deposit(address indexed artToken, uint256 amountDeposit);  
  let artTokenAddress = event.params.artToken.toHexString()

  let ARTToken = ARTTokenType.load('ART-' + artTokenAddress)
  if(ARTToken === null) {
    log.error('ART Token not found: {} {}', [event.params.artToken.toHexString(), event.params.amountDeposit.toString()])
    return
  }

  ARTToken.totalAmountDeposit = ARTToken.totalAmountDeposit.plus(event.params.amountDeposit)
  ARTToken.save()

  let ARECBank = ARECBankType.load('ARECBank')
  if (ARECBank === null) {
    ARECBank = new ARECBankType('ARECBank')
    ARECBank.numARTTokens = 0
    ARECBank.ARTTokens = []
  }

  ARECBank.timeTrx = event.block.timestamp.toString()
  ARECBank.blockHeight = event.block.number.toString()
  ARECBank.save()
}