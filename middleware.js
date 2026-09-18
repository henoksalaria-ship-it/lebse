import {stagingGateway} from './server/staging-gateway.mjs';
export const config = {runtime:'nodejs'};
export default function middleware(request) { return stagingGateway(request); }
