import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  // Define the number of iterations for the test
  iterations: 10,
};

export default function () {
  // Make a GET request to the target URL
  http.get('https://quickpizza.grafana.com');

  // Sleep for 1 second to simulate real-world usage
  sleep(1);
}