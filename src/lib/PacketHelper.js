import pb from "./protobuf/index.js"
import {
  Buffer
} from './buffer.js'
import crypto from './crypto.js'
import {
  gzip as _gzip
} from './zlib.js'
import {
  promisify
} from './util.js'
import { createApiHandler } from "../until/apiHandler.js"

const gzip = promisify(_gzip)


const RandomUInt = () => crypto.randomBytes(4).readUInt32BE()

export const Elem = async (
  e,
  content
) => {
  try {
    let packet = buildBasePbContent(e.isGroup ? e.group_id : e.user_id, e.isGroup)
    const parsed = typeof content === 'object' ? content : JSON.parse(content)
    const elements = Array.isArray(parsed) ? parsed : [parsed]

    packet = {
      ...packet,
      "3": {
        "1": {
          "2": elements
        }
      },
      "4": RandomUInt(),
      "5": RandomUInt()
    }

    const data = pb.encode(parseJsonToMap(packet))
    return {
      cmd: 'MessageSvc.PbSendMsg',
      data: Buffer.from(data).toString("hex")
    }
  } catch (error) {
    console.error(`sendMessage failed: ${error.message}`, error)
  }
}

export const Raw = async (
  e,
  cmd,
  content
) => {
  try {
    const data = pb.encode(parseJsonToMap(content))
    return {
      cmd: cmd,
      data: Buffer.from(data).toString("hex")
    }
  } catch (error) {
    console.error(`sendMessage failed: ${error.message}`, error)
  }
}

export const Long = async (
  e,
  port,
  content
) => {
  try {
    const data = {
      "2": {
        "1": "MultiMsg",
        "2": {
          "1": [{
            "3": {
              "1": {
                "2": typeof content === 'object' ? content : JSON.parse(content)
              }
            }
          }]
        }
      }
    }
    console.log(JSON.stringify(data))
    const protoBytes = pb.encode(parseJsonToMap(data))
    const compressedData = await gzip(protoBytes)

    const target = BigInt(e.group_id) //BigInt(chatType === GROUP ? peer : getUinFromUid(peer)) // Using BigInt for long values

    const json = {
      "2": {
        "1": 3, //chatType === C2C ? 1 : 3,
        "2": {
          "2": `${e.group_id}`
        },
        "3": target,
        "4": `hex->${bytesToHex(compressedData)}`
      },
      "15": {
        "1": 4,
        "2": 2,
        "3": 9,
        "4": 0
      }
    }

    const final = pb.encode(parseJsonToMap(json))
    const api = createApiHandler(port);
    const req = await api.request('send_packet', {
      cmd: 'trpc.group.long_msg_interface.MsgService.SsoSendLongMsg',
      data: Buffer.from(final).toString("hex")
    })
    const resp = pb.decode(req.data)
    const resid = resp["2"]["3"].toString()
    const elem = {
      "37": {
        "6": 1,
        "7": resid,
        "17": 0,
        "19": {
          "15": 0,
          "31": 0,
          "41": 0
        }
      }
    }
    return elem
  } catch (error) {
    console.error(`sendMessage failed: ${error.message}`, error)
  }
}

function buildBasePbContent(id, isGroupMsg) {
  const base = {
    "1": {
      [isGroupMsg ? "2" : "1"]: isGroupMsg ? {
        "1": id
      } : {
        "2": id
      }
    },
    "2": {
      "1": 1,
      "2": 0,
      "3": 0
    },
    "3": {
      "1": {
        "2": []
      }
    }
  }
  return base
}

function parseJsonToMap(json, path = []) {
  const result = {}
  if (Array.isArray(json)) {
    return json.map((item, index) => parseJsonToMap(item, path.concat(index + 1)))
  } else if (typeof json === "object" && json !== null) {
    for (const key in json) {
      const numKey = Number(key)
      if (Number.isNaN(numKey)) {
        throw new Error(`Key is not a valid integer: ${key}`)
      }
      const currentPath = path.concat(key)
      const value = json[key]

      if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          result[numKey] = value.map((item, idx) =>
            parseJsonToMap(item, currentPath.concat(String(idx + 1)))
          )
        } else {
          result[numKey] = parseJsonToMap(value, currentPath)
        }
      } else {
        if (typeof value === "string") {
          if (value.startsWith("hex->")) {
            const hexStr = value.slice("hex->".length)
            if (isHexString(hexStr)) {
              result[numKey] = hexStringToByteArray(hexStr)
            } else {
              result[numKey] = value
            }
          } else if (
            currentPath.slice(-2).join(",") === "5,2" &&
            isHexString(value)
          ) {
            result[numKey] = hexStringToByteArray(value)
          } else {
            result[numKey] = value
          }
        } else {
          result[numKey] = value
        }
      }
    }
  } else {
    return json
  }
  return result
}

function isHexString(s) {
  return s.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(s)
}

function hexStringToByteArray(s) {
  return Buffer.from(s, "hex")
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}