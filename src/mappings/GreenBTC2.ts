/* eslint-disable prefer-const */
import { BigInt, Address, log } from '@graphprotocol/graph-ts'
import { GreenBTC20, GreenBTC20Domain, GreenBT20User, GreenBT20Action } from '../types/schema'
import { DomainGreenized, DomainRegistered } from '../types/GreenBTC2/GreenBTC2'
import { crypto, ByteArray, Bytes } from "@graphprotocol/graph-ts";

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let BI_18 = BigInt.fromI32(18)

function convertRatio(chance: i32 ): i32 {
  return  (65536 * chance + 5000) / 10000;        // Never overflow
}

function reverseBytesArray(bytes: Bytes): Bytes {
  let reversed = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    reversed[i] = bytes[bytes.length - 1 - i];
  }
  return Bytes.fromUint8Array(reversed);
}

// event DomainRegistered(uint256 domainID, bytes32 domainInfo)
export function handleDomainRegistered(event: DomainRegistered): void {

  let greenBTC20 = GreenBTC20.load("GreenBTC20")
  if (greenBTC20 === null) {
    greenBTC20 = new GreenBTC20("GreenBTC20")
    greenBTC20.lastBlockHeight = 0
    greenBTC20.domainCount = 0
    greenBTC20.actionCount = 0
    greenBTC20.save()
  }

  greenBTC20.lastBlockHeight = event.block.number.toI32()
  greenBTC20.domainCount += 1
  greenBTC20.save()

  let greenBTC20Domain = new GreenBTC20Domain("GBTC2_Domain_" + event.params.domainID.toString().padStart(6,'0'))

  let domainInfoBN = BigInt.fromByteArray(reverseBytesArray(event.params.domainInfo))

  greenBTC20Domain.lastBlockHeight = 0
  greenBTC20Domain.x = domainInfoBN.rightShift(248).bitAnd(BigInt.fromI32(0xFF)).toI32()
  greenBTC20Domain.y = domainInfoBN.rightShift(240).bitAnd(BigInt.fromI32(0xFF)).toI32()
  greenBTC20Domain.w = domainInfoBN.rightShift(232).bitAnd(BigInt.fromI32(0xFF)).toI32()
  greenBTC20Domain.h = domainInfoBN.rightShift(224).bitAnd(BigInt.fromI32(0xFF)).toI32()
  greenBTC20Domain.decimal = domainInfoBN.rightShift(56).bitAnd(BigInt.fromI32(0xFF)).toI32()

  greenBTC20Domain.boxLimit = domainInfoBN.rightShift(192).bitAnd(BigInt.fromU32(0xFFFFFFFF)).toU32()
  greenBTC20Domain.boxSteps = 0

  let chances = new Array<i32>(8).fill(0)
  let chanceSums = new Array<i32>(8).fill(0)
  let chanceAllSum = 0

  for (let index = 0; index < 8; index++) {
    chances[index] = domainInfoBN.rightShift(u8(176-(index*16))).bitAnd(BigInt.fromI32(0xFFFF)).toI32()
    chanceAllSum += chances[index]
    chanceSums[index] += chanceAllSum
  }

  greenBTC20Domain.chances = chances
  greenBTC20Domain.chanceSums = chanceSums

  greenBTC20Domain.wons = new Array<i32>(8).fill(0)
  greenBTC20Domain.userCount = 0
  greenBTC20Domain.actionCount = 0

  greenBTC20Domain.save()
}

// event DomainGreenized(address gbtcActor, uint256 actionNumber, uint256 blockHeight, 
//                       uint256 domainID, uint256 boxStart, uint256 boxNumber)
export function handleDomainGreenized(event: DomainGreenized): void {

  let greenBT20Action  = new GreenBT20Action("GBTC2_Action_" + event.params.actionNumber.toString().padStart(8,'0'))
  greenBT20Action.blockHeight = event.block.number.toI32()
  greenBT20Action.blockHash = event.block.hash.toHexString()
  greenBT20Action.greener = event.params.gbtcActor.toHexString()
  greenBT20Action.actionId = event.params.actionNumber.toI32()
  greenBT20Action.domainId = event.params.domainID.toI32()
  greenBT20Action.boxStart = event.params.boxStart.toI32()
  greenBT20Action.boxCount = event.params.boxNumber.toI32()

  //let gbtcActorBN = BigInt.fromByteArray(reverseBytesArray(event.params.gbtcActor))   // Does not work
  let gbtcActorBN = BigInt.fromUnsignedBytes(reverseBytesArray(event.params.gbtcActor))

  let actionInfo = (event.params.actionNumber.leftShift(224)).plus(event.params.domainID.leftShift(208))
  actionInfo = actionInfo.plus(event.params.boxStart.leftShift(176))
  actionInfo = actionInfo.plus(event.params.boxNumber.leftShift(160))
  actionInfo = gbtcActorBN.plus(actionInfo)

  let blockHashBytes = ByteArray.fromHexString(greenBT20Action.blockHash.slice(2).padStart(64,'0'))
  let actionInfoBytes = ByteArray.fromHexString(actionInfo.toHexString().slice(2).padStart(64,'0'))           
  let luckyNumber = crypto.keccak256(blockHashBytes.concat(actionInfoBytes))

  let greenBTC20Domain = GreenBTC20Domain.load("GBTC2_Domain_" + event.params.domainID.toString().padStart(6,'0'))!

  let luckyTemp = BigInt.fromByteArray(reverseBytesArray(Bytes.fromByteArray(luckyNumber)));

  let counters = new Array<i32>(8).fill(0)
  let result = new Array<i32>(event.params.boxNumber.toI32()).fill(0)

  for (let index = 0; index < event.params.boxNumber.toI32(); index++) {
    let ration = luckyTemp.bitAnd(BigInt.fromI32(0xFFFF)).toI32()
    if (ration <= greenBTC20Domain.chanceSums[7]) {
        for (let ind = 0; ind < 8; ind++) {
            if (ration <= greenBTC20Domain.chanceSums[ind]) {
                result[index] = ind + 1
                counters[ind] += 1
                break
            }
        }
    }

    if ((index & 0x0F) == 0x0F) {
        luckyNumber = crypto.keccak256(luckyNumber)
        luckyTemp = BigInt.fromByteArray(reverseBytesArray(Bytes.fromByteArray(luckyNumber)))
    } else {
        luckyTemp = luckyTemp.rightShift(16)
    }
  }

//  log.warning('GreenBTC20Domain Test: {}, {}, {}, {}, {}, {}, {} ', [actionInfoBytes.toHexString(), blockHashBytes.toHexString(), luckyNumber.toHexString(), event.params.boxNumber.toString(), event.params.boxNumber.leftShift(160).toHexString(), gbtcActorBN.toHexString(), (event.params.boxNumber.leftShift(160)).plus(gbtcActorBN).toHexString() ])

  let totalWon = 0;
  let newWons = new Array<i32>(8).fill(0)
  for (let index = 0; index < 8; index++) {
      const offset = totalWon
      newWons[index] = greenBTC20Domain.wons[index] + counters[index]
      totalWon += counters[index]
      counters[index] = offset
  }

  let wonList = new Array<i32>(totalWon).fill(0);
  for (let index = 0; index < event.params.boxNumber.toI32(); index++) {
      const wonType = result[index]
      if (wonType != 0) {
        const offset = counters[wonType-1];                                           // get won offset
        wonList[offset] = ( event.params.boxStart.toI32() + index)
        counters[wonType-1] = offset + 1                                              // move the offset
      }
  }

  greenBT20Action.luckyCounter = counters
  greenBT20Action.wonList = wonList

  greenBT20Action.save()

  let gbtcActorID = "GBTC2_User_" + event.params.gbtcActor.toHexString()
  let greenBT20User = GreenBT20User.load(gbtcActorID)
  if (greenBT20User === null) {
    greenBT20User = new GreenBT20User(gbtcActorID)
    greenBT20User.lastBlockHeight = 0
    greenBT20User.actionCount = 0
    greenBT20User.boxAmount = 0
    greenBT20User.save()

    greenBTC20Domain.userCount += 1
  }

  greenBTC20Domain.lastBlockHeight = event.block.number.toI32()
  greenBTC20Domain.boxSteps += event.params.boxNumber.toI32()
  greenBTC20Domain.wons = newWons
  greenBTC20Domain.actionCount += 1
  greenBTC20Domain.save()

  greenBT20User.lastBlockHeight = event.block.number.toI32()
  greenBT20User.actionCount += 1
  greenBT20User.boxAmount += event.params.boxNumber.toI32()
  greenBT20User.save()

  let greenBTC20 = GreenBTC20.load("GreenBTC20")!
  greenBTC20.lastBlockHeight = event.block.number.toI32()
  greenBTC20.actionCount += 1
  greenBTC20.save()
}