# CarChain — Hyperledger Fabric FYP Documentation

**Author:** Barkat Ali  
**Project:** CarChain — Blockchain Vehicle Management System  
**Platform:** Hyperledger Fabric v3.1.x  
**Chaincode Language:** JavaScript (Node.js)  
**OS:** Ubuntu Linux  
**Last Updated:** March 2026  

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

---

# Key Concepts Glossary

Understanding these terms is essential for Fabric development and job interviews.

**MSP (Membership Service Provider)** — The identity system. Every organization has an MSP containing certificates that prove who belongs to it. When a peer receives a transaction, it checks the MSP to verify the sender is legitimate.

**Channel** — A private subnet of the blockchain. Only members of a channel can see its transactions. Multiple channels can exist for different business purposes.

**Orderer / etcdraft** — The consensus mechanism. The orderer receives transactions from clients, orders them into blocks, and distributes those blocks to peers. etcdraft is crash fault tolerant — the network keeps running even if some nodes go down.

**Genesis Block** — The very first block of a channel. It contains the entire channel configuration baked in — organizations, policies, orderer settings. Every node reads this when joining.

**Chaincode** — Smart contracts in Fabric. Written in Go, Java, or JavaScript. Contains business logic like registerVehicle() and transferOwnership().

**Endorsement Policy** — Rules defining whose signature is required for a transaction to be valid. Example: "MAJORITY of orgs must endorse."

**Chaincode Lifecycle** — The multi-step process to deploy chaincode in Fabric v2+: Package → Install on peers → Approve by each org → Commit to channel. Every org must approve before chaincode goes live.

**Channel Participation API** — The modern Fabric v3.x method of joining a channel. Instead of bootstrapping the orderer with a genesis file, the orderer starts clean and channels are added dynamically using the osnadmin tool.

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

The modern Docker Compose v2 plugin is required. Fabric v3.x scripts use `docker compose` (with a space), not the old `docker-compose` (with a dash).

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

Downloaded Fabric binaries and Docker images using the official Fabric bootstrap script.

```bash
curl -sSL https://bit.ly/2ysbOFE | bash -s
```

This installed:
- Fabric binaries (`cryptogen`, `configtxgen`, `peer`, `orderer`, `osnadmin`)
- Fabric Docker images
- fabric-samples directory

**Fabric version installed: v3.1.1**

Binaries located at:
```
/home/ali/Documents/carChain/fabric-samples/bin/
```

Added to PATH:
```bash
export PATH=$PATH:/home/ali/Documents/carChain/fabric-samples/bin
```

Verification:
```bash
cryptogen version   # v3.1.1
configtxgen --version  # v3.1.1
```

---

# Phase 2 — Environment Verification (Test Network)

Before building CarChain, the Fabric environment was verified using the built-in sample test network. This is standard practice for every Fabric developer.

```bash
cd /home/ali/Documents/carChain/fabric-samples/test-network
./network.sh up
docker ps
# Expected: orderer, peer0.org1, peer0.org2, CA containers
```

Sample chaincode was also deployed to verify the full chaincode lifecycle works:

```bash
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-go -ccl go
```

Chaincode lifecycle verified:
- Packaging ✅
- Installation ✅
- Approval ✅
- Commit ✅

Test network was then shut down before starting the real project:

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

Directory structure created:
```
carchain-network/
├── organizations/       ← crypto material and MSP identities
├── channel-artifacts/   ← genesis block and channel files
├── configtx/            ← network configuration files
└── chaincode/           ← smart contracts (JavaScript)
```

### Directory Roles

**`organizations/`**
Contains all cryptographic material generated by `cryptogen`. Every peer, orderer, and admin has a folder here with their certificates (who they are), private keys (their digital signature), and TLS certificates (for encrypted communication).

**`channel-artifacts/`**
Contains the genesis block and any channel transaction files generated by `configtxgen`. The genesis block is the foundation of the entire channel.

**`configtx/`**
Contains `configtx.yaml` — the constitution of the blockchain network. Defines organizations, policies, orderer settings, and channel profiles.

**`chaincode/`**
Will contain CarChain smart contracts written in JavaScript. Functions will include `registerVehicle()`, `transferOwnership()`, `verifyVehicle()`, and `getVehicleHistory()`.

---

# Phase 4 — Cryptographic Identity Generation

## crypto-config.yaml

Defines the organizations for which `cryptogen` will generate identities.

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

**`EnableNodeOUs: true`** — Enables Node Organization Units, which allows Fabric to distinguish between peer identities, admin identities, and client identities within the same org. Required for modern endorsement policies.

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
│       ├── orderers/orderer.carchain.com/
│       │   ├── msp/
│       │   └── tls/         ← server.crt, server.key, ca.crt
│       └── users/Admin@carchain.com/
└── peerOrganizations/
    ├── govt.carchain.com/
    │   ├── msp/
    │   ├── peers/peer0.govt.carchain.com/
    │   │   ├── msp/
    │   │   └── tls/
    │   └── users/
    └── users.carchain.com/
        ├── msp/
        ├── peers/peer0.users.carchain.com/
        │   ├── msp/
        │   └── tls/
        └── users/
```

> **Do not modify anything in this folder.** These are the cryptographic identities of the entire network.

---

# Phase 5 — Network Constitution (configtx.yaml)

## What is configtx.yaml?

This file is the governance document of the CarChain blockchain. It defines every rule, every organization, every policy. `configtxgen` reads this file to produce the channel genesis block.

File location: `/home/ali/Documents/carChain/carchain-network/configtx/configtx.yaml`

## Final Working Configuration

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
        V3_0: true
    Orderer: &OrdererCapabilities
        V3_0: true
    Application: &ApplicationCapabilities
        V3_0: true

Application: &ApplicationDefaults
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

    CarChainChannel:
        <<: *ChannelDefaults
        Orderer:
            <<: *OrdererDefaults
            Organizations:
                - *OrdererOrg
        Application:
            <<: *ApplicationDefaults
            Organizations:
                - *GovtOrg
                - *UsersOrg
```

> **Important note for Fabric v3.x:** There is no `CarChainGenesis` profile and no `Consortiums` section. The old system channel concept was completely removed in Fabric v3.x. There is only one profile — the application channel profile.

---

# Phase 6 — Genesis Block Generation

## What is the genesis block?

The genesis block is the very first block of the CarChain channel. It contains the entire channel constitution (from configtx.yaml) baked into binary format. Every node that joins the channel reads this block first to understand who the members are and what the rules are.

## Command

```bash
cd /home/ali/Documents/carChain/carchain-network

configtxgen \
  -profile CarChainChannel \
  -outputBlock ./channel-artifacts/carchain-genesis.block \
  -channelID carchainchannel \
  -configPath ./configtx
```

## Expected Output

```
INFO Loading configuration
INFO Generating genesis block
INFO Creating application channel genesis block
INFO Writing genesis block
```

## Troubleshooting Encountered

**Error 1:** `no policies defined`
- Cause: configtx.yaml was missing policy sections
- Fix: Added Readers/Writers/Admins policies to all sections

**Error 2:** `consenter info did not specify client TLS cert`
- Cause: Fabric v3.x requires TLS cert paths in the EtcdRaft consenter block even when running without TLS on peers
- Fix: Added `ClientTLSCert` and `ServerTLSCert` paths pointing to the orderer's generated TLS certs

**Result:** `carchain-genesis.block` successfully created in `channel-artifacts/`

---

# Phase 7 — Docker Network Setup

## docker-compose.yaml

File location: `/home/ali/Documents/carChain/carchain-network/docker-compose.yaml`

```yaml
networks:
  carchain:

services:

  orderer.carchain.com:
    container_name: orderer.carchain.com
    image: hyperledger/fabric-orderer:3.1
    environment:
      - ORDERER_GENERAL_LISTENADDRESS=0.0.0.0
      - ORDERER_GENERAL_LISTENPORT=7050
      - ORDERER_GENERAL_LOCALMSPID=OrdererMSP
      - ORDERER_GENERAL_LOCALMSPDIR=/var/hyperledger/orderer/msp
      - ORDERER_GENERAL_BOOTSTRAPMETHOD=none
      - ORDERER_CHANNELPARTICIPATION_ENABLED=true
      - ORDERER_ADMIN_LISTENADDRESS=0.0.0.0:9443
      - ORDERER_ADMIN_TLS_ENABLED=false
      - ORDERER_ADMIN_TLS_CLIENTAUTHREQUIRED=false
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
    ports:
      - 7050:7050
      - 9443:9443
    networks:
      - carchain

  peer0.govt.carchain.com:
    container_name: peer0.govt.carchain.com
    image: hyperledger/fabric-peer:3.1
    environment:
      - CORE_PEER_ID=peer0.govt.carchain.com
      - CORE_PEER_LOCALMSPID=GovtMSP
      - CORE_PEER_MSPCONFIGPATH=/var/hyperledger/peer/msp
      - CORE_PEER_ADDRESS=peer0.govt.carchain.com:7051
      - CORE_PEER_LISTENADDRESS=0.0.0.0:7051
    volumes:
      - ./organizations/peerOrganizations/govt.carchain.com/peers/peer0.govt.carchain.com/msp:/var/hyperledger/peer/msp
      - ./organizations/peerOrganizations/govt.carchain.com/peers/peer0.govt.carchain.com/tls:/var/hyperledger/peer/tls
    ports:
      - 7051:7051
    networks:
      - carchain

  peer0.users.carchain.com:
    container_name: peer0.users.carchain.com
    image: hyperledger/fabric-peer:3.1
    environment:
      - CORE_PEER_ID=peer0.users.carchain.com
      - CORE_PEER_LOCALMSPID=UsersMSP
      - CORE_PEER_MSPCONFIGPATH=/var/hyperledger/peer/msp
      - CORE_PEER_ADDRESS=peer0.users.carchain.com:9051
      - CORE_PEER_LISTENADDRESS=0.0.0.0:9051
    volumes:
      - ./organizations/peerOrganizations/users.carchain.com/peers/peer0.users.carchain.com/msp:/var/hyperledger/peer/msp
      - ./organizations/peerOrganizations/users.carchain.com/peers/peer0.users.carchain.com/tls:/var/hyperledger/peer/tls
    ports:
      - 9051:9051
    networks:
      - carchain
```

## Key Configuration Decisions Explained

**`BOOTSTRAPMETHOD=none`** — Fabric v3.x does not allow bootstrapping the orderer from a genesis file. The orderer starts with no channel and channels are added dynamically using osnadmin.

**`CHANNELPARTICIPATION_ENABLED=true`** — Enables the Channel Participation API, which is the v3.x mechanism for joining channels.

**`ORDERER_GENERAL_TLS_ENABLED=true`** — TLS is mandatory for etcdraft consensus nodes. The orderer will refuse to start without it. TLS certificates were already generated by cryptogen.

**`ORDERER_ADMIN_TLS_ENABLED=false`** — The admin port (9443) used by osnadmin does not require TLS in our setup, simplifying the channel join commands.

**Port 9443** — The orderer admin port. This is where osnadmin sends the channel genesis block to activate the channel.

## Troubleshooting Encountered

**Error 1:** `Bootstrap method: 'file' is forbidden`
- Cause: Old configtx had system channel approach, docker-compose had BOOTSTRAPMETHOD=file
- Fix: Set BOOTSTRAPMETHOD=none, enabled Channel Participation API

**Error 2:** `TLS is required for running ordering nodes of cluster type`
- Cause: etcdraft is a cluster consensus — TLS is non-negotiable
- Fix: Enabled ORDERER_GENERAL_TLS with cert paths from cryptogen output

## Starting the Network

```bash
cd /home/ali/Documents/carChain/carchain-network
docker compose up -d
docker ps
```

## Confirmed Running Containers

| Container | Image | Port |
|---|---|---|
| orderer.carchain.com | fabric-orderer:3.1 | 7050, 9443 |
| peer0.govt.carchain.com | fabric-peer:3.1 | 7051 |
| peer0.users.carchain.com | fabric-peer:3.1 | 9051 |

All three containers running successfully. ✅

Orderer log confirmed:
```
Starting orderer with TLS enabled
Channel Participation API enabled
Starting without a system channel
Beginning to serve requests
```

---

# Current Project Status

## Completed ✅

| Phase | Description |
|---|---|
| Environment Setup | Docker, Go, Docker Compose v2 |
| Fabric Installation | v3.1.1 binaries and images |
| Test Network Verification | Full chaincode lifecycle tested |
| Project Structure | carchain-network directory created |
| Crypto Material | cryptogen generated all MSP identities |
| configtx.yaml | Network constitution defined |
| Genesis Block | carchain-genesis.block created |
| Docker Compose | All three containers running |

## Pending ⏳

| Phase | Description |
|---|---|
| Channel Activation | osnadmin channel join (orderer joins channel) |
| Peer Channel Join | Both peers join carchainchannel |
| Chaincode Development | Write CarChain smart contracts in JavaScript |
| Chaincode Deployment | Full lifecycle on the channel |
| Application Layer | Node.js app connects via Fabric SDK |

---

# Development Flow Reference

```
cryptogen          → generates org identities and TLS certs
      ↓
configtxgen        → generates channel genesis block
      ↓
docker compose up  → starts orderer and peer containers
      ↓
osnadmin           → orderer joins the channel (NEXT STEP)
      ↓
peer channel join  → peers join the channel
      ↓
chaincode install  → smart contracts deployed
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

# Regenerate genesis block
configtxgen -profile CarChainChannel \
  -outputBlock ./channel-artifacts/carchain-genesis.block \
  -channelID carchainchannel \
  -configPath ./configtx
```

---

*Documentation maintained as a live build log throughout FYP development.*
