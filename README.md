# CarChain — Blockchain Vehicle Management System

A permissioned blockchain network built on **Hyperledger Fabric v3.1.x** for managing vehicle registration, ownership transfers, and vehicle history in a tamper-proof, transparent way.

## Project Overview

CarChain replaces centralized vehicle databases with an immutable blockchain ledger. Every registration, transfer, and update is permanently recorded and visible only to authorized participants.

## Network Architecture

| Component | Domain | Role |
|---|---|---|
| Orderer | orderer.carchain.com | Block ordering (etcdraft) |
| Govt Peer | peer0.govt.carchain.com | Vehicle authority, registrations |
| Users Peer | peer0.users.carchain.com | Car owners, transfers |

**Channel:** `carchainchannel`

## Tech Stack

- Hyperledger Fabric v3.1.x
- Docker + Docker Compose v2
- JavaScript (Node.js) — Chaincode
- cryptogen + configtxgen — Network tooling

## Project Structure
```
carchain-network/
├── organizations/        ← crypto material (not pushed to git)
├── channel-artifacts/    ← genesis block
├── configtx/             ← network constitution (configtx.yaml)
├── chaincode/            ← smart contracts (JavaScript)
├── crypto-config.yaml    ← org identity blueprint
└── docker-compose.yaml   ← container definitions
```

## Setup & Run

### Prerequisites
- Docker + Docker Compose v2
- Hyperledger Fabric v3.1.x binaries in PATH
- Go

### 1. Generate crypto material
```bash
cryptogen generate --config=crypto-config.yaml --output=organizations
```

### 2. Generate genesis block
```bash
configtxgen -profile CarChainChannel \
  -outputBlock ./channel-artifacts/carchain-genesis.block \
  -channelID carchainchannel \
  -configPath ./configtx
```

### 3. Start the network
```bash
docker compose up -d
```

### 4. Join the channel (coming soon)
```bash
osnadmin channel join ...
```

## Planned Chaincode Functions
```javascript
registerVehicle(vehicleId, owner, details)
transferOwnership(vehicleId, newOwner)
verifyVehicle(vehicleId)
getVehicleHistory(vehicleId)
getVehiclesByOwner(ownerId)
```

## Author

**Barkat Ali** — Final Year Project (FYP)
Hyperledger Fabric Blockchain Development
