const admin = require("firebase-admin");
const paranoicsCrud = require('../../src/users/paranoicsCrud');

admin.initializeApp({ projectId: 'potato' });

describe('Test for paranoics users CRUD', () => {

    it('createParanoinUser should return response 1', async () => {
        const params = {
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
        }

        const result = await paranoicsCrud.createParanoicUser(params);
        expect(result.response).toBe(1);
    });
})