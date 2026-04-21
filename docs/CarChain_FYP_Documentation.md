# CarChain — Hyperledger Fabric FYP Documentation

**Author:** Barkat Ali
**Project:** CarChain — Blockchain Vehicle Management System
**Platform:** Hyperledger Fabric v2.5.0
**Chaincode Language:** JavaScript (Node.js)
**OS:** Ubuntu Linux
**Last Updated:** April 2026

---

# Project Overview

CarChain is a permissioned blockchain-based vehicle management system built on Hyperledger Fabric. Instead of vehicle records sitting in a centralized government database that can be tampered with, CarChain stores all vehicle data on an immutable blockchain where every change is recorded permanently and transparently.

## What the system will do

- Vehicle Registration — government registers new vehicles on-chain
- Ownership Transfer — citizens transfer car ownership through the blockchain
- Government Verification — authority can verify and approve records
- Transparent Vehicle History — full tamper-proof history of every vehicle

## Network Organizations

| Organization | Domain | Role |
|---|---|---|
| GovtOrg | govt.carchain.com | Vehicle authority, registration, approvals |
| UsersOrg | users.carchain.com | Citizens, car owners, buyers and sellers |
| OrdererOrg | carchain.com | Manages block ordering and consensus |

## Project Path

```
/home/ali/Documents/carChain/carchain-network/
```

## GitHub Repository

```
https://github.com/ali-cs6/CarChain
```

---

# Key Concepts Glossary

Understanding these terms is essential for Fabric development and job interviews.

**MSP (Membership Service Provider)** — The identity system. Every organization has an MSP containing certificates that prove who belongs to it. When a peer receives a transaction, it checks the MSP to verify the sender is legitimate.

**Channel** — A private subnet of the blockchain. Only members of a channel can see its transactions. Multiple channels can exist for different business purposes.

**Orderer / etcdraft** — The consensus mechanism. The orderer receives transactions from clients, orders them into blocks, and distributes those blocks to peers. etcdraft is crash fault tolerant — the network keeps running even if some nodes go down.

**Genesis Block** — The very first block of a channel. It contains the entire channel configuration baked in — organizations, policies, orderer settings. Every node reads this when joining.

**System Channel** — In Fabric v2.x, the orderer bootstraps using a system channel genesis block. This defines the orderer's own configuration before any application channels exist.

**Application Channel** — The actual channel where peers transact. In CarChain this is `carchainchannel`. Created after the orderer is running using `peer channel create`.

**Chaincode** — Smart contracts in Fabric. Written in Go, Java, or JavaScript. Contains business logic like registerVehicle() and transferOwnership().

**Endorsement Policy** — Rules defining whose signature is required for a transaction to be valid. Example: "MAJORITY of orgs must endorse."

**Chaincode Lifecycle (v2.x)** — The multi-step process to deploy chaincode: Package → Install on peers → Approve by each org → Commit to channel. Every org must approve before chaincode goes live.

**FABRIC_CFG_PATH** — Environment variable that tells the peer binary where to find `core.yaml` — its main configuration file. Must be set before running any `peer` commands.

---

# Phase 0 — Environment Setup

## System Preparation

Fresh Ubuntu machine prepared with required dependencies.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git wget
```

## Docker Installation

Docker was installed and configured to run without sudo.

```bash
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
# Log out and back in after this
```

## Docker Compose v2 Plugin

The modern Docker Compose v2 plugin is required. Fabric scripts use `docker compose` (with a space), not the old `docker-compose` (with a dash).

```bash
# Add Docker's official repository
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-compose-plugin
```

Verification:
```bash
docker compose version
# Expected: Docker Compose version v2.x.x
```

> **Why this matters:** The industry has fully moved to v2. Every real Fabric project uses `docker compose` (space). The old `docker-compose` v1 is no longer maintained.

## Go Installation

```bash
sudo apt install golang -y
go version
```

---

# Phase 1 — Hyperledger Fabric Installation

## Final Decision — Fabric v2.5.0

After initially attempting Fabric v3.1.x, the project was migrated to **Fabric v2.5.0** for the following reasons:

- Fabric v3.x removed the system channel and genesis block bootstrap method entirely
- The `osnadmin` Channel Participation API (v3.x method) requires perfectly matched binaries and Docker images — any version mismatch causes silent failures
- Fabric v2.5 is an LTS (Long Term Support) release, stable, well documented, and widely used in industry
- v2.5 uses the proven genesis block bootstrap approach which is reliable and well understood

> **For career purposes:** Understanding v2.5 is still highly relevant in industry. The core concepts — MSP, channels, chaincode lifecycle, endorsement — are identical across versions.

## Download Fabric v2.5.0

```bash
cd /home/ali/Documents/carChain
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.0 1.5.7
```

This downloads:
- Fabric v2.5.0 binaries into `fabric-samples/bin/`
- Fabric CA v1.5.7
- All matching Docker images tagged `2.5`

## Set PATH Permanently

```bash
nano ~/.bashrc
# Add this line at the bottom:
export PATH=/home/ali/Documents/carChain/fabric-samples/bin:$PATH

source ~/.bashrc
```

## Verification

```bash
peer version          # v2.5.0
configtxgen --version # v2.5.0
cryptogen version     # v2.5.0
```

---

# Phase 2 — Environment Verification (Test Network)

Before building CarChain, the Fabric environment was verified using the built-in sample test network.

```bash
cd /home/ali/Documents/carChain/fabric-samples/test-network
./network.sh up
docker ps
```

Sample chaincode deployed to verify full lifecycle:

```bash
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-go -ccl go
```

Chaincode lifecycle verified:
- Packaging ✅
- Installation ✅
- Approval ✅
- Commit ✅

Test network shut down before starting real project:

```bash
./network.sh down
```

---

# Phase 3 — CarChain Project Structure

A fresh project directory was created, completely separate from fabric-samples.

**Project root:**
```
/home/ali/Documents/carChain/carchain-network/
```

Directory structure:
```
carchain-network/
├── organizations/       ← crypto material and MSP identities (not pushed to GitHub)
├── channel-artifacts/   ← genesis block and channel files
├── configtx/            ← network configuration files
├── chaincode/           ← smart contracts (JavaScript)
├── crypto-config.yaml   ← org identity blueprint
├── docker-compose.yaml  ← container definitions
├── .gitignore           ← excludes private keys from git
└── README.md            ← project homepage on GitHub
```

### Directory Roles

**`organizations/`** — All cryptographic material generated by `cryptogen`. Every peer, orderer, and admin has a folder here with their certificates, private keys, and TLS certificates. Never pushed to GitHub.

**`channel-artifacts/`** — Contains the system channel genesis block (`genesis.block`), the channel transaction (`carchain.tx`), and the application channel block (`carchainchannel.block`).

**`configtx/`** — Contains `configtx.yaml` — the constitution of the blockchain network. Defines organizations, policies, orderer settings, and channel profiles.

**`chaincode/`** — Will contain CarChain smart contracts written in JavaScript.

---

# Phase 4 — Cryptographic Identity Generation

## crypto-config.yaml

File location: `/home/ali/Documents/carChain/carchain-network/crypto-config.yaml`

```yaml
OrdererOrgs:
  - Name: Orderer
    Domain: carchain.com
    Specs:
      - Hostname: orderer

PeerOrgs:
  - Name: Govt
    Domain: govt.carchain.com
    EnableNodeOUs: true
    Template:
      Count: 1
    Users:
      Count: 1

  - Name: Users
    Domain: users.carchain.com
    EnableNodeOUs: true
    Template:
      Count: 1
    Users:
      Count: 1
```

**`EnableNodeOUs: true`** — Allows Fabric to distinguish between peer, admin, and client identities within the same org. Required for endorsement policies.

## Generate Identities

```bash
cd /home/ali/Documents/carChain/carchain-network
cryptogen generate --config=crypto-config.yaml --output=organizations
```

## Generated Structure

```
organizations/
├── ordererOrganizations/
│   └── carchain.com/
│       ├── msp/
│       ├── tlsca/
│       └── orderers/orderer.carchain.com/
│           ├── msp/
│           └── tls/         ← server.crt, server.key, ca.crt
└── peerOrganizations/
    ├── govt.carchain.com/
    │   ├── msp/
    │   ├── tlsca/
    │   ├── peers/peer0.govt.carchain.com/
    │   └── users/Admin@govt.carchain.com/
    └── users.carchain.com/
        ├── msp/
        ├── tlsca/
        ├── peers/peer0.users.carchain.com/
        └── users/Admin@users.carchain.com/
```

> **Do not modify anything in this folder.** These are the cryptographic identities of the entire network. Regenerate with cryptogen if needed.

---

# Phase 5 — Network Constitution (configtx.yaml)

## What is configtx.yaml?

The governance document of the CarChain blockchain. It defines every rule, every organization, every policy. `configtxgen` reads this file to produce the genesis block and channel transaction.

File location: `/home/ali/Documents/carChain/carchain-network/configtx/configtx.yaml`

## Final Working Configuration (v2.5)

```yaml
Organizations:

    - &OrdererOrg
        Name: OrdererMSP
        ID: OrdererMSP
        MSPDir: ../organizations/ordererOrganizations/carchain.com/msp
        OrdererEndpoints:
            - orderer.carchain.com:7050
        Policies:
            Readers:
                Type: Signature
                Rule: "OR('OrdererMSP.member')"
            Writers:
                Type: Signature
                Rule: "OR('OrdererMSP.member')"
            Admins:
                Type: Signature
                Rule: "OR('OrdererMSP.admin')"

    - &GovtOrg
        Name: GovtMSP
        ID: GovtMSP
        MSPDir: ../organizations/peerOrganizations/govt.carchain.com/msp
        Policies:
            Readers:
                Type: Signature
                Rule: "OR('GovtMSP.member')"
            Writers:
                Type: Signature
                Rule: "OR('GovtMSP.member')"
            Admins:
                Type: Signature
                Rule: "OR('GovtMSP.admin')"
            Endorsement:
                Type: Signature
                Rule: "OR('GovtMSP.peer')"
        AnchorPeers:
            - Host: peer0.govt.carchain.com
              Port: 7051

    - &UsersOrg
        Name: UsersMSP
        ID: UsersMSP
        MSPDir: ../organizations/peerOrganizations/users.carchain.com/msp
        Policies:
            Readers:
                Type: Signature
                Rule: "OR('UsersMSP.member')"
            Writers:
                Type: Signature
                Rule: "OR('UsersMSP.member')"
            Admins:
                Type: Signature
                Rule: "OR('UsersMSP.admin')"
            Endorsement:
                Type: Signature
                Rule: "OR('UsersMSP.peer')"
        AnchorPeers:
            - Host: peer0.users.carchain.com
              Port: 9051

Capabilities:
    Channel: &ChannelCapabilities
        V2_0: true
    Orderer: &OrdererCapabilities
        V2_0: true
    Application: &ApplicationCapabilities
        V2_0: true

Application: &ApplicationDefaults
    Organizations:
    Policies:
        Readers:
            Type: ImplicitMeta
            Rule: "ANY Readers"
        Writers:
            Type: ImplicitMeta
            Rule: "ANY Writers"
        Admins:
            Type: ImplicitMeta
            Rule: "MAJORITY Admins"
        Endorsement:
            Type: ImplicitMeta
            Rule: "MAJORITY Endorsement"
    Capabilities:
        <<: *ApplicationCapabilities

Orderer: &OrdererDefaults
    OrdererType: etcdraft
    EtcdRaft:
        Consenters:
            - Host: orderer.carchain.com
              Port: 7050
              ClientTLSCert: ../organizations/ordererOrganizations/carchain.com/orderers/orderer.carchain.com/tls/server.crt
              ServerTLSCert: ../organizations/ordererOrganizations/carchain.com/orderers/orderer.carchain.com/tls/server.crt
    BatchTimeout: 2s
    BatchSize:
        MaxMessageCount: 10
        AbsoluteMaxBytes: 99 MB
        PreferredMaxBytes: 512 KB
    Policies:
        Readers:
            Type: ImplicitMeta
            Rule: "ANY Readers"
        Writers:
            Type: ImplicitMeta
            Rule: "ANY Writers"
        Admins:
            Type: ImplicitMeta
            Rule: "MAJORITY Admins"
        BlockValidation:
            Type: ImplicitMeta
            Rule: "ANY Writers"
    Capabilities:
        <<: *OrdererCapabilities

Channel: &ChannelDefaults
    Policies:
        Readers:
            Type: ImplicitMeta
            Rule: "ANY Readers"
        Writers:
            Type: ImplicitMeta
            Rule: "ANY Writers"
        Admins:
            Type: ImplicitMeta
            Rule: "MAJORITY Admins"
    Capabilities:
        <<: *ChannelCapabilities

Profiles:

    CarChainGenesis:
        <<: *ChannelDefaults
        Orderer:
            <<: *OrdererDefaults
            Organizations:
                - *OrdererOrg
        Consortiums:
            CarChainConsortium:
                Organizations:
                    - *GovtOrg
                    - *UsersOrg

    CarChainChannel:
        Consortium: CarChainConsortium
        <<: *ChannelDefaults
        Application:
            <<: *ApplicationDefaults
            Organizations:
                - *GovtOrg
                - *UsersOrg
```

> **Key difference from v3.x:** Two profiles are required in v2.5. `CarChainGenesis` creates the system channel genesis block that bootstraps the orderer. `CarChainChannel` creates the application channel transaction that peers use to join.

---

# Phase 6 — Channel Artifacts Generation

## Generate System Channel Genesis Block

The orderer reads this block at startup to initialize itself.

```bash
cd /home/ali/Documents/carChain/carchain-network

configtxgen \
  -profile CarChainGenesis \
  -channelID system-channel \
  -outputBlock ./channel-artifacts/genesis.block \
  -configPath ./configtx
```

## Generate Application Channel Transaction

Used by `peer channel create` to create the `carchainchannel` channel.

```bash
configtxgen \
  -profile CarChainChannel \
  -outputCreateChannelTx ./channel-artifacts/carchain.tx \
  -channelID carchainchannel \
  -configPath ./configtx
```

## channel-artifacts/ contents after generation

```
channel-artifacts/
├── genesis.block       ← system channel, read by orderer at startup
└── carchain.tx         ← used to create the application channel
```

---

# Phase 7 — Docker Network Setup

## docker-compose.yaml (v2.5 Final)

File location: `/home/ali/Documents/carChain/carchain-network/docker-compose.yaml`

```yaml
networks:
  carchain:

services:

  orderer.carchain.com:
    container_name: orderer.carchain.com
    image: hyperledger/fabric-orderer:2.5
    environment:
      - ORDERER_GENERAL_LISTENADDRESS=0.0.0.0
      - ORDERER_GENERAL_LISTENPORT=7050
      - ORDERER_GENERAL_LOCALMSPID=OrdererMSP
      - ORDERER_GENERAL_LOCALMSPDIR=/var/hyperledger/orderer/msp
      - ORDERER_GENERAL_BOOTSTRAPMETHOD=file
      - ORDERER_GENERAL_BOOTSTRAPFILE=/var/hyperledger/orderer/genesis.block
      - ORDERER_GENERAL_TLS_ENABLED=true
      - ORDERER_GENERAL_TLS_PRIVATEKEY=/var/hyperledger/orderer/tls/server.key
      - ORDERER_GENERAL_TLS_CERTIFICATE=/var/hyperledger/orderer/tls/server.crt
      - ORDERER_GENERAL_TLS_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]
      - ORDERER_GENERAL_CLUSTER_CLIENTCERTIFICATE=/var/hyperledger/orderer/tls/server.crt
      - ORDERER_GENERAL_CLUSTER_CLIENTPRIVATEKEY=/var/hyperledger/orderer/tls/server.key
      - ORDERER_GENERAL_CLUSTER_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]
    volumes:
      - ./organizations/ordererOrganizations/carchain.com/orderers/orderer.carchain.com/msp:/var/hyperledger/orderer/msp
      - ./organizations/ordererOrganizations/carchain.com/orderers/orderer.carchain.com/tls:/var/hyperledger/orderer/tls
      - ./channel-artifacts/genesis.block:/var/hyperledger/orderer/genesis.block
    ports:
      - 7050:7050
    networks:
      - carchain

  peer0.govt.carchain.com:
    container_name: peer0.govt.carchain.com
    image: hyperledger/fabric-peer:2.5
    environment:
      - CORE_PEER_ID=peer0.govt.carchain.com
      - CORE_PEER_LOCALMSPID=GovtMSP
      - CORE_PEER_MSPCONFIGPATH=/var/hyperledger/peer/msp
      - CORE_PEER_ADDRESS=peer0.govt.carchain.com:7051
      - CORE_PEER_LISTENADDRESS=0.0.0.0:7051
      - CORE_PEER_TLS_ENABLED=true
      - CORE_PEER_TLS_CERT_FILE=/var/hyperledger/peer/tls/server.crt
      - CORE_PEER_TLS_KEY_FILE=/var/hyperledger/peer/tls/server.key
      - CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/peer/tls/ca.crt
    volumes:
      - ./organizations/peerOrganizations/govt.carchain.com/peers/peer0.govt.carchain.com/msp:/var/hyperledger/peer/msp
      - ./organizations/peerOrganizations/govt.carchain.com/peers/peer0.govt.carchain.com/tls:/var/hyperledger/peer/tls
    ports:
      - 7051:7051
    networks:
      - carchain

  peer0.users.carchain.com:
    container_name: peer0.users.carchain.com
    image: hyperledger/fabric-peer:2.5
    environment:
      - CORE_PEER_ID=peer0.users.carchain.com
      - CORE_PEER_LOCALMSPID=UsersMSP
      - CORE_PEER_MSPCONFIGPATH=/var/hyperledger/peer/msp
      - CORE_PEER_ADDRESS=peer0.users.carchain.com:9051
      - CORE_PEER_LISTENADDRESS=0.0.0.0:9051
      - CORE_PEER_TLS_ENABLED=true
      - CORE_PEER_TLS_CERT_FILE=/var/hyperledger/peer/tls/server.crt
      - CORE_PEER_TLS_KEY_FILE=/var/hyperledger/peer/tls/server.key
      - CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/peer/tls/ca.crt
    volumes:
      - ./organizations/peerOrganizations/users.carchain.com/peers/peer0.users.carchain.com/msp:/var/hyperledger/peer/msp
      - ./organizations/peerOrganizations/users.carchain.com/peers/peer0.users.carchain.com/tls:/var/hyperledger/peer/tls
    ports:
      - 9051:9051
    networks:
      - carchain
```

## Key Configuration Decisions Explained

**`BOOTSTRAPMETHOD=file`** — In Fabric v2.5 the orderer reads the system channel genesis block at startup. This is the stable, proven bootstrap method.

**`BOOTSTRAPFILE`** — Points to `genesis.block` mounted into the container. This is what the orderer reads to initialize the system channel.

**`ORDERER_GENERAL_TLS_ENABLED=true`** — TLS is mandatory for etcdraft consensus. The orderer refuses to start without it.

**`CORE_PEER_TLS_ENABLED=true`** — Peers also need TLS enabled so they can communicate securely with the orderer and each other.

## Starting the Network

```bash
cd /home/ali/Documents/carChain/carchain-network
docker compose up -d
docker ps
```

## Confirmed Running Containers

| Container | Image | Port |
|---|---|---|
| orderer.carchain.com | fabric-orderer:2.5 | 7050 |
| peer0.govt.carchain.com | fabric-peer:2.5 | 7051 |
| peer0.users.carchain.com | fabric-peer:2.5 | 9051 |

All three containers running successfully. ✅

Orderer log confirmed:
```
Version: v2.5.0
Starting system channel 'system-channel'
1 became leader at term 3
Beginning to serve requests
Start accepting requests as Raft leader
```

---

# Phase 8 — GitHub Repository Setup

## .gitignore

Critical — prevents private keys from being pushed to GitHub.

```
organizations/ordererOrganizations/
organizations/peerOrganizations/
production/
node_modules/
npm-debug.log
.DS_Store
.env
```

> **Lesson learned:** The organizations/ folder was accidentally pushed in an early commit exposing private keys publicly. It was immediately removed using `git rm -r --cached` and crypto material was regenerated. Always set up `.gitignore` before the first commit.

## Git Setup and Push

```bash
git config --global user.name "Barkat Ali"
git config --global user.email "your@email.com"

cd /home/ali/Documents/carChain/carchain-network
git init
git add .
git status   # verify no crypto material is tracked
git commit -m "Initial commit — CarChain Fabric v2.5 network setup"
git remote add origin https://github.com/ali-cs6/CarChain.git
git branch -M main
git push -u origin main
```

> **GitHub authentication:** GitHub requires a Personal Access Token instead of a password. Generate one at GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic). Check the `repo` scope.

## Repository Structure on GitHub

```
https://github.com/ali-cs6/CarChain
├── channel-artifacts/
├── configtx/
├── docs/
│   └── CarChain_FYP_Documentation.md
├── .gitignore
├── README.md
├── crypto-config.yaml
└── docker-compose.yaml
```

## Updating GitHub After Each Session

```bash
git add .
git commit -m "describe what was done"
git push
```

---

# Phase 9 — Channel Creation (In Progress)

## Required Environment Variables

Before running any `peer` command these must be set. The peer binary needs `FABRIC_CFG_PATH` to find its `core.yaml` config file.

```bash
export FABRIC_CFG_PATH=/home/ali/Documents/carChain/fabric-samples/config

export CORE_PEER_LOCALMSPID=GovtMSP
export CORE_PEER_MSPCONFIGPATH=/home/ali/Documents/carChain/carchain-network/organizations/peerOrganizations/govt.carchain.com/users/Admin@govt.carchain.com/msp
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE=/home/ali/Documents/carChain/carchain-network/organizations/peerOrganizations/govt.carchain.com/tlsca/tlsca.govt.carchain.com-cert.pem
```

## Create the Application Channel
the channel was successfully created using GovtMSP admin identity, using the following command.

```bash
cd /home/ali/Documents/carChain/carchain-network

peer channel create \
  -o localhost:7050 \
  -c carchainchannel \
  -f ./channel-artifacts/carchain.tx \
  --outputBlock ./channel-artifacts/carchainchannel.block \
  --tls \
  --cafile ./organizations/ordererOrganizations/carchain.com/tlsca/tlsca.carchain.com-cert.pem
```

## Peer channel join
Both organizations joined the channel. During this phase, it was discovered that while the Orderer requires TLS, the Peers were successfully joined using non-TLS communication to simplify local development.

### 1. GovtOrg join
```bash
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=GovtMSP
export CORE_PEER_MSPCONFIGPATH=/home/ali/Documents/carChain/carchain-network/organizations/peerOrganizations/govt.carchain.com/users/Admin@govt.carchain.com/msp
export CORE_PEER_TLS_ENABLED=false

peer channel join -b ./channel-artifacts/carchainchannel.block
```

### UsersOrg join
```bash
export CORE_PEER_ADDRESS=localhost:9051
export CORE_PEER_LOCALMSPID="UsersMSP"
export CORE_PEER_MSPCONFIGPATH=/home/ali/Documents/carChain/carchain-network/organizations/peerOrganizations/users.carchain.com/users/Admin@users.carchain.com/msp
export CORE_PEER_TLS_ENABLED=false

peer channel join -b ./channel-artifacts/carchainchannel.block
```

while the Orderer (Consensus) uses TLS for secure block distribution, the Peer-to-CLI communication was set to plain-text to focus on debugging Chaincode logic in a local dev environment.

---

# Current Project Status

## Completed ✅

| Phase | Description |
|---|---|
| Environment Setup | Docker, Go, Docker Compose v2 |
| Fabric Installation | v2.5.0 binaries and Docker images |
| Test Network Verification | Full chaincode lifecycle tested |
| Project Structure | carchain-network directory created |
| Crypto Material | cryptogen generated all MSP identities |
| configtx.yaml | Network constitution defined (v2.5) |
| Genesis Block | genesis.block + carchain.tx generated |
| Docker Compose | All three containers running on v2.5 |
| GitHub Repository | Repo live at github.com/ali-cs6/CarChain |

## Pending ⏳

| Phase | Description |
|---|---|
| Channel Creation | peer channel create — carchainchannel |
| Peer Channel Join | Both peers join carchainchannel |
| Chaincode Development | Write CarChain smart contracts in JavaScript |
| Chaincode Deployment | Full lifecycle — install, approve, commit |
| Application Layer | Node.js app connects via Fabric Gateway SDK |

---

# Development Flow Reference

```
cryptogen          → generates org identities and TLS certs
      ↓
configtxgen        → generates genesis.block + carchain.tx
      ↓
docker compose up  → starts orderer and peer containers
      ↓
peer channel create → creates carchainchannel  ← NEXT STEP
      ↓
peer channel join  → both peers join the channel
      ↓
chaincode install  → smart contracts deployed on peers
      ↓
chaincode approve  → each org approves the chaincode
      ↓
chaincode commit   → chaincode goes live on channel
      ↓
application        → Node.js app interacts with blockchain
```

---

# Planned Chaincode Functions

```javascript
registerVehicle(vehicleId, owner, details)
transferOwnership(vehicleId, newOwner)
verifyVehicle(vehicleId)
getVehicleHistory(vehicleId)
getVehiclesByOwner(ownerId)
```

---

# Important Commands Reference

```bash
# Start network
docker compose up -d

# Stop network
docker compose down

# Check containers
docker ps

# Check orderer logs
docker logs orderer.carchain.com

# Regenerate crypto material
cryptogen generate --config=crypto-config.yaml --output=organizations

# Regenerate genesis block (v2.5)
configtxgen -profile CarChainGenesis \
  -channelID system-channel \
  -outputBlock ./channel-artifacts/genesis.block \
  -configPath ./configtx

# Regenerate channel transaction
configtxgen -profile CarChainChannel \
  -outputCreateChannelTx ./channel-artifacts/carchain.tx \
  -channelID carchainchannel \
  -configPath ./configtx

# Set peer environment (run before any peer command)
export FABRIC_CFG_PATH=/home/ali/Documents/carChain/fabric-samples/config
export CORE_PEER_LOCALMSPID=GovtMSP
export CORE_PEER_MSPCONFIGPATH=/home/ali/Documents/carChain/carchain-network/organizations/peerOrganizations/govt.carchain.com/users/Admin@govt.carchain.com/msp
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE=/home/ali/Documents/carChain/carchain-network/organizations/peerOrganizations/govt.carchain.com/tlsca/tlsca.govt.carchain.com-cert.pem

# Create channel
peer channel create \
  -o localhost:7050 \
  -c carchainchannel \
  -f ./channel-artifacts/carchain.tx \
  --outputBlock ./channel-artifacts/carchainchannel.block \
  --tls \
  --cafile ./organizations/ordererOrganizations/carchain.com/tlsca/tlsca.carchain.com-cert.pem

# Push to GitHub
git add .
git commit -m "describe changes"
git push
```

---

*Documentation maintained as a live build log throughout FYP development.*
