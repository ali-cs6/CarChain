# CarChain — Blockchain Vehicle Management System

A permissioned blockchain network built on **Hyperledger Fabric v2.5.0** for managing vehicle registration, ownership transfers, and vehicle history in a tamper-proof, transparent way.

## Project Overview

CarChain replaces centralized vehicle databases with an immutable blockchain ledger. Every registration, transfer, and update is permanently recorded and visible only to authorized participants. No single authority can alter records without consensus from the network.

## Network Architecture

| Component | Domain | Role |
|---|---|---|
| Orderer | orderer.carchain.com | Block ordering (etcdraft consensus) |
| Govt Peer | peer0.govt.carchain.com | Vehicle authority, registrations, approvals |
| Users Peer | peer0.users.carchain.com | Car owners, ownership transfers |

**Channel:** `carchainchannel`
**Consensus:** etcdraft
**TLS:** Enabled on all nodes

## Tech Stack

- Hyperledger Fabric v2.5.0
- Docker + Docker Compose v2
- JavaScript (Node.js) — Chaincode
- cryptogen — Identity and certificate generation
- configtxgen — Genesis block and channel artifact generation

## Project Structure

```
carchain-network/
├── organizations/        ← crypto material (not pushed to git)
├── channel-artifacts/    ← genesis.block + channel transaction
├── configtx/             ← network constitution (configtx.yaml)
├── chaincode/            ← smart contracts (JavaScript)
├── docs/                 ← full build log and documentation
├── crypto-config.yaml    ← org identity blueprint
└── docker-compose.yaml   ← container definitions
```

## Setup & Run

### Prerequisites

- Docker + Docker Compose v2
- Hyperledger Fabric v2.5.0 binaries in PATH
- Go

### 1. Generate crypto material

```bash
cryptogen generate --config=crypto-config.yaml --output=organizations
```

### 2. Generate genesis block and channel transaction

```bash
# System channel genesis block (bootstraps the orderer)
configtxgen -profile CarChainGenesis \
  -channelID system-channel \
  -outputBlock ./channel-artifacts/genesis.block \
  -configPath ./configtx

# Application channel transaction
configtxgen -profile CarChainChannel \
  -outputCreateChannelTx ./channel-artifacts/carchain.tx \
  -channelID carchainchannel \
  -configPath ./configtx
```

### 3. Start the network

```bash
docker compose up -d
docker ps
```

### 4. Set peer environment variables

```bash
export FABRIC_CFG_PATH=/path/to/fabric-samples/config
export CORE_PEER_LOCALMSPID=GovtMSP
export CORE_PEER_MSPCONFIGPATH=./organizations/peerOrganizations/govt.carchain.com/users/Admin@govt.carchain.com/msp
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE=./organizations/peerOrganizations/govt.carchain.com/tlsca/tlsca.govt.carchain.com-cert.pem
```

### 5. Create the channel

```bash
peer channel create \
  -o localhost:7050 \
  -c carchainchannel \
  -f ./channel-artifacts/carchain.tx \
  --outputBlock ./channel-artifacts/carchainchannel.block \
  --tls \
  --cafile ./organizations/ordererOrganizations/carchain.com/tlsca/tlsca.carchain.com-cert.pem
```

### 6. Join peers to channel *(coming soon)*

```bash
peer channel join -b ./channel-artifacts/carchainchannel.block
```

### 7. Deploy chaincode *(coming soon)*

```bash
peer lifecycle chaincode install ...
peer lifecycle chaincode approveformyorg ...
peer lifecycle chaincode commit ...
```

## Planned Chaincode Functions

```javascript
registerVehicle(vehicleId, owner, details)
transferOwnership(vehicleId, newOwner)
verifyVehicle(vehicleId)
getVehicleHistory(vehicleId)
getVehiclesByOwner(ownerId)
```

## Build Progress

- [x] Environment setup (Docker, Go, Fabric v2.5.0)
- [x] Fabric test network verification
- [x] CarChain project structure
- [x] Cryptographic identity generation
- [x] configtx.yaml network constitution
- [x] Genesis block and channel transaction generated
- [x] Docker network running (all 3 containers)
- [x] Channel creation
- [x] Peer channel join
- [ ] Chaincode development (JavaScript)
- [ ] Chaincode deployment
- [ ] Node.js application layer

## Documentation

Full build log, troubleshooting history, and concept explanations available in [`docs/CarChain_FYP_Documentation.md`](docs/CarChain_FYP_Documentation.md)

## Author

**Barkat Ali** — Final Year Project (FYP)
BS Computer Science
Hyperledger Fabric Blockchain Development
