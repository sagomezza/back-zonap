const admin = require("firebase-admin");
const usersCrud = require('../../src/users/crud')

admin.initializeApp({ projectId: 'potato' });

describe('Test for users CRUD', () => {

    it('create full type user should return response 1', async () => {

        const params = {
            email: "test@unittesting.com",
            phone: "+573213214545",
            name: "User",
            lastName: "Tester",
            plate: "TTT000",
            brand: "Mazda",
            vehicleType: "car",
            type: "full"
        };

        const result = await usersCrud.createUser(params)
        expect(result.response).toBe(1)
    });

    it('create starter type user should return response 1', async () => {
        const params = {
            phone: "+573213214521",
            plate: "SSS000",
            vehicleType: "car",
            type: "starter"
        };

        const result = await usersCrud.createUser(params)
        expect(result.response).toBe(1)
    });

    it('create user without phone should return response 1', async () => {
        const params = {
            phone: "1xfOaRuOK3J6P0dYjzhz",
            plate: "MMM000",
            vehicleType: "car",
            type: "starter"
        };

        const result = await usersCrud.createUser(params)
        expect(result.response).toBe(1)
    })

    it('readUser should return response 1', async () => {
        const params = {
            phone: '+573213214545'
        }

        const result = await usersCrud.readUser(params);
        expect(result.response).toBe(1)
    });

    it('findUserByPlate should return response 1', async () => {

        const params = {
            plate: "TTT000"
        };

        const result = await usersCrud.findUserByPlate(params);
        expect(result.response).toBe(1)
    });


    // it('editUser should return response 1', async () => {
    //     jest.setTimeout(10000);
        
    //     const params = {
    //         id: "yr0h4JpwNRCZtY2eBLTT",
    //         phone: "+563213218989",
    //         email: "testing2@unittesting.com",
    //         name: "User2",
    //         lastName: "Tester2",
    //     };

    //     const result = await usersCrud.editUser(params);
    //     expect(result.response).toBe(1);
    // });
}); 