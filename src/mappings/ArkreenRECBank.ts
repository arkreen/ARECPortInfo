/* eslint-disable prefer-const */
import { BigInt, BigDecimal, log } from '@graphprotocol/graph-ts'
import { ARECBank as ARECBankType, ARTToken as ARTTokenType, ARTTokenSales as ARTTokenSalesType, Token } from '../types/schema'

import { ARTPriceChanged, ARTSold, Withdraw, Deposit } from '../types/ArkreenRECBank/ArkreenRECBank'
import { fetchTokenSymbol, fetchTokenName, fetchTokenDecimals, fetchTokenTotalSupply } from './helpers'

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let ZERO_BD = BigDecimal.fromString('0')
export let ONE_BD = BigDecimal.fromString('1')
export let BI_18 = BigInt.fromI32(18)

const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

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
    ARECBank.save()
  }

  let ARTToken = ARTTokenType.load(artTokenAddress)
  if (ARTToken === null) {
    ARTToken = new ARTTokenType(artTokenAddress)
    ARTToken.numPaymentToken = 0
    ARTToken.totalAmountDeposit = ZERO_BI
    ARTToken.totalAmountSold = ZERO_BI
    ARTToken.paymentTokens = []
    ARTToken.save()
  }

  let ARTTokenSales = ARTTokenSalesType.load(ARTTokenSalesID)
  if (ARTTokenSales === null) {
    ARTTokenSales = new ARTTokenSalesType(ARTTokenSalesID)
    ARTTokenSales.salePrices = ZERO_BI
    ARTTokenSales.saleIncomes = ZERO_BI
    ARTTokenSales.withdrawValues = ZERO_BI
    ARTTokenSales.save()
  }
 
  ARTTokenSales.salePrices = event.params.newPrice
  ARTTokenSales.save()

  let i: i32
  for (i= 0; i < ARTToken.numPaymentToken; i++) {
    if (ARTToken.paymentTokens[i] === event.params.payToken) break
  }
  if(i === ARTToken.numPaymentToken) {
    ARTToken.numPaymentToken = ARTToken.numPaymentToken + 1
    ARTToken.paymentTokens.push(event.params.payToken)
    ARTToken.save()

    let paymentToken = new Token(payTokenAddress)
    paymentToken.symbol = fetchTokenSymbol(event.params.payToken)
    paymentToken.name = fetchTokenName(event.params.payToken)
    paymentToken.decimals = fetchTokenDecimals(event.params.payToken)
    paymentToken.totalSupply = fetchTokenTotalSupply(event.params.payToken)
    paymentToken.save()
  }

  for (i =0; i < ARECBank.numARTTokens; i++) {
    if (ARECBank.ARTTokens[i] === event.params.artToken) break
  }
  if(i === ARECBank.numARTTokens) {
    ARECBank.numARTTokens = ARECBank.numARTTokens + 1
    ARECBank.ARTTokens.push(event.params.artToken)
    ARECBank.save()

    let artToken = new Token(payTokenAddress)
    artToken.symbol = fetchTokenSymbol(event.params.artToken)
    artToken.name = fetchTokenName(event.params.artToken)
    artToken.decimals = fetchTokenDecimals(event.params.artToken)
    artToken.totalSupply = fetchTokenTotalSupply(event.params.artToken)
    artToken.save()
  }
}

export function handleARTSold(event: ARTSold): void {
  // event ARTSold(address indexed artToken, address indexed payToken, uint256 payAmount, uint256 artAmount);
  let artTokenAddress = event.params.artToken.toHexString()
  let payTokenAddress = event.params.payToken.toHexString()
  let ARTTokenSalesID = artTokenAddress + '-' + payTokenAddress

  let ARTToken = ARTTokenType.load(artTokenAddress)
  let ARTTokenSales = ARTTokenSalesType.load(ARTTokenSalesID)

  if((ARTToken === null) || (ARTTokenSales === null)) {
    log.error('ART Token not found: {} {} {} {}', [event.params.artToken.toHexString(), event.params.payToken.toHexString(), 
        event.params.payAmount.toString(), event.params.artAmount.toString()])
    return
  }

  ARTToken.totalAmountSold = ARTToken.totalAmountSold.plus(event.params.artAmount)
  ARTToken.save()

  ARTTokenSales.saleIncomes = ARTTokenSales.saleIncomes.plus(event.params.payAmount)
  ARTTokenSales.save()
}

export function handleWithdraw(event: Withdraw): void {
  // event Withdraw(address indexed artToken, address indexed payToken, uint256 balance);  
  let artTokenAddress = event.params.artToken.toHexString()
  let payTokenAddress = event.params.payToken.toHexString()
  let ARTTokenSalesID = artTokenAddress + '-' + payTokenAddress

  let ARTToken = ARTTokenType.load(artTokenAddress)
  let ARTTokenSales = ARTTokenSalesType.load(ARTTokenSalesID)

  if((ARTToken === null) || (ARTTokenSales === null)) {
    log.error('ART Token not found: {} {} {}', [event.params.artToken.toHexString(), event.params.payToken.toHexString(), event.params.balance.toString()])
    return
  }

  ARTTokenSales.withdrawValues = ARTTokenSales.withdrawValues.plus(event.params.balance)
  ARTTokenSales.save()
}

export function handleDeposit(event: Deposit): void {
  // event Deposit(address indexed artToken, uint256 amountDeposit);  
  let artTokenAddress = event.params.artToken.toHexString()

  let ARTToken = ARTTokenType.load(artTokenAddress)
  if(ARTToken === null) {
    log.error('ART Token not found: {} {} {}', [event.params.artToken.toHexString(), event.params.amountDeposit.toString()])
    return
  }

  ARTToken.totalAmountDeposit = ARTToken.totalAmountDeposit.plus(event.params.amountDeposit)
  ARTToken.save()
}