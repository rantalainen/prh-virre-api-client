# prh-virre-api-client

**PrhVirreApiClient** is a third party PRH VIRRE API client for NodeJS.

## Installation

Add to project's package.json:

```
npm install @rantalainen/prh-virre-api-client
```

### Import

```javascript
import { PrhVirreApiClient } from '@rantalainen/prh-virre-api-client';
```

## Setup client with options

Client id and secret + user and password are needed to access all API functions. Please contact PRH for api information.

```javascript
const prhApiClient = new PrhVirreApiClient({
  clientId: 'client_id',
  clientSecret: 'client_secret',
  userName: 'user',
  password: 'password'
});
```

## Resources

The following api endpoints have been implemented:

- `financialPeriods` Retrieves a list of financial periods for the specified business.
- `financialStatements` Retrieves financial statements for the specified businessId within the given date range. In response there will be a metadata containing financial period with record numbers referring to data files in attachments.

### Example

```javascript
const financialPeriods = await prhVirreApiClient.getFinancialPeriods('1234567-8', 'krek');

const financialStatements = await prhVirreApiClient.getFinancialStatements('1234567-8', 'krek', '2022-01-01', '2022-12-31');
```
