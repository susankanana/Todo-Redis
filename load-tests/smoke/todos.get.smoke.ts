import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 1,        // 1 virtual user for smoke test
    iterations: 1, // 1 iteration for quick health check
};

export default function () {
    const url = 'http://localhost:8082/todo';

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjE5LCJ1c2VyX2lkIjoxOSwiZmlyc3RfbmFtZSI6IlN1c2FuIiwibGFzdF9uYW1lIjoiS2FuYW5hIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNzQ5NTY0NTc2LCJpYXQiOjE3NDk0NzgxNzZ9.GDnoOztWbxEc7JynW9iEjo9KHQcimYbSp8l04r6-WdU`
        },
    };

    const res = http.get(url, params);
    console.log('🟡 Response Status:', res.status);
    console.log('🟡 Response Body:', res.body);


    check(res, {
        'status is 200': (r) => r.status === 200,
        'has data array': (r) => {
            try {
                const body = JSON.parse(r.body as string);
                return Array.isArray(body.data);
            } catch {
                return false;
            }
        },
    });

    sleep(1);
}