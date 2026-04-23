'use strict'; //no silent errors

const { Contract } = require('fabric-contract-api');

class CarChain extends Contract {

    // Initialize ledger with sample vehicles
    async initLedger(ctx) { //ctx is the transaction context provided by the Fabric runtime
        const vehicles = [
            {
                vehicleId: 'VH001',
                make: 'Toyota',
                model: 'Corolla',
                year: '2022',
                color: 'White',
                owner: 'Ali Hassan',
                registeredBy: 'GovtMSP',
                status: 'active',
                timestamp: new Date().toISOString()
            },
            {
                vehicleId: 'VH002',
                make: 'Honda',
                model: 'Civic',
                year: '2021',
                color: 'Black',
                owner: 'Sara Khan',
                registeredBy: 'GovtMSP',
                status: 'active',
                timestamp: new Date().toISOString()
            }
        ];

        for (const vehicle of vehicles) {
            await ctx.stub.putState(vehicle.vehicleId, Buffer.from(JSON.stringify(vehicle)) //store the vehicle object as a JSON string in the ledger, using vehicleId as the key
            );
            console.log(`Vehicle ${vehicle.vehicleId} initialized on ledger`);
        }
    }

    // Register a new vehicle
    async registerVehicle(ctx, vehicleId, make, model, year, color, owner) {

        // Check if vehicle already exists
        const existing = await ctx.stub.getState(vehicleId);
        if (existing && existing.length > 0) {
            throw new Error(`Vehicle ${vehicleId} already exists on the ledger`);
        }

        // Only GovtMSP can register vehicles
        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'GovtMSP') {
            throw new Error(`Only GovtMSP can register vehicles. Caller is: ${mspId}`);
        }

        // create a new vehicle object with the provided details + who registered it and the timestamp
        const vehicle = {
            vehicleId,
            make,
            model,
            year,
            color,
            owner,
            registeredBy: mspId,
            status: 'active',
            timestamp: new Date().toISOString()
        };

        // put into ledger state
        await ctx.stub.putState(vehicleId, Buffer.from(JSON.stringify(vehicle)));

        console.log(`Vehicle ${vehicleId} registered by ${mspId}`);
        return JSON.stringify(vehicle);
    }

    // Query a single vehicle
    async queryVehicle(ctx, vehicleId) {
        const vehicle = await ctx.stub.getState(vehicleId); //getState returns a byte array

        if (!vehicle || vehicle.length === 0) {
            throw new Error(`Vehicle ${vehicleId} does not exist`);
        }

        return vehicle.toString(); //convert byte array to string and return the JSON representation of the vehicle
    }

    // Transfer vehicle ownership
    async transferOwnership(ctx, vehicleId, newOwner) {
        const vehicleBytes = await ctx.stub.getState(vehicleId);

        if (!vehicleBytes || vehicleBytes.length === 0) {
            throw new Error(`Vehicle ${vehicleId} does not exist`);
        }

        const vehicle = JSON.parse(vehicleBytes.toString()); //parse the byte array into a JavaScript object

        if (vehicle.status !== 'active') {
            throw new Error(`Vehicle ${vehicleId} is not active. Status: ${vehicle.status}`);
        }

        // change owner and update timestamp
        const previousOwner = vehicle.owner;
        vehicle.owner = newOwner;
        vehicle.timestamp = new Date().toISOString();

        await ctx.stub.putState(vehicleId, Buffer.from(JSON.stringify(vehicle))); //update the ledger with the new ownership details

        console.log(`Vehicle ${vehicleId} transferred from ${previousOwner} to ${newOwner}`);
        return JSON.stringify(vehicle);
    }

    // Get full transaction history of a vehicle
    async getVehicleHistory(ctx, vehicleId) {
        const historyIterator = await ctx.stub.getHistoryForKey(vehicleId); //getHistoryForKey returns an iterator that allows us to traverse through all the historical transactions related to the given key (vehicleId in this case)
        const history = []; //array to hold the history records

        let result = await historyIterator.next();
        while (!result.done) {
            const record = {
                txId: result.value.txId,
                timestamp: result.value.timestamp,
                isDelete: result.value.isDelete,
                data: result.value.value.toString('utf8')
            };
            history.push(record);
            result = await historyIterator.next();
        }

        await historyIterator.close();
        return JSON.stringify(history);
    }

    // Get all vehicles on the ledger
    async getAllVehicles(ctx) {
        const iterator = await ctx.stub.getStateByRange('', '');
        const vehicles = [];

        let result = await iterator.next();
        while (!result.done) {
            const vehicle = JSON.parse(result.value.value.toString('utf8'));
            vehicles.push(vehicle);
            result = await iterator.next();
        }

        await iterator.close();
        return JSON.stringify(vehicles);
    }

    // Change vehicle status (active / stolen / scrapped)
    async updateVehicleStatus(ctx, vehicleId, newStatus) {
        const validStatuses = ['active', 'stolen', 'scrapped', 'removed'];

        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
        }

        // Only GovtMSP can change status
        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'GovtMSP') {
            throw new Error(`Only GovtMSP can update vehicle status. Caller is: ${mspId}`);
        }

        const vehicleBytes = await ctx.stub.getState(vehicleId);
        if (!vehicleBytes || vehicleBytes.length === 0) {
            throw new Error(`Vehicle ${vehicleId} does not exist`);
        }

        const vehicle = JSON.parse(vehicleBytes.toString());
        vehicle.status = newStatus;
        vehicle.timestamp = new Date().toISOString();

        await ctx.stub.putState(vehicleId, Buffer.from(JSON.stringify(vehicle))
        );

        return JSON.stringify(vehicle);
    }

    // Verify vehicle exists and is active
    async verifyVehicle(ctx, vehicleId) {
        const vehicleBytes = await ctx.stub.getState(vehicleId);

        if (!vehicleBytes || vehicleBytes.length === 0) {
            return JSON.stringify({ exists: false, status: null });
        }

        const vehicle = JSON.parse(vehicleBytes.toString());
        return JSON.stringify({
            exists: true,
            status: vehicle.status,
            owner: vehicle.owner
        });
    }
}

module.exports = CarChain;