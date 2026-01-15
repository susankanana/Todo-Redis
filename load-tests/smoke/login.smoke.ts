import http from 'k6/http'; //imports the http module from k6, which provides functions like http.get() and http.post() for making HTTP requests.
import { check, sleep } from 'k6'; //check: Used to assert that the response meets expected conditions (e.g., status code, response body).
//sleep: Pauses execution for a given time (in seconds), simulating realistic user behavior between requests.

export const options = {
    vus: 1, // 1 virtual user
    iterations: 1, // How many times the function will run per virtual user
    duration: '15s', // 15 seconds duration

};

export default function () {
    const url = 'http://localhost:8082/auth/login'; //url to test
    const payload = JSON.stringify({ //simulate a user logging in
        email: 'suzzannekans@gmail.com',
        password: 'pass123'
    });

    const params = {
        headers: {
            'Content-Type': 'application/json', //defines request headers, stating the body is JSON.
        },
    };

    const res = http.post(url, payload, params); //sends a POST request to the login endpoint with the payload and headers.The response is stored in res.



    check(res, {
        'status is 200': (r) => r.status === 200,
        'response has token': (r) => {
            try {
                const body = JSON.parse(r.body as string);
                return typeof body.token === 'string';
            } catch {
                return false;
            }
        },
    });

    sleep(1); //Pauses for 1 second before ending this virtual user's run. Simulates a user thinking or waiting.
}