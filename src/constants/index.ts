/**
 * Constants
 * Application-wide constants and configuration.
 *
 * All environment-specific values (URLs, keys) are in ./env.ts.
 */

export { API_BASE_URL } from './env';
export { SIP } from './sip';
export {
  CATEGORIES,
  getCategoryInfo,
  workTypeToCategoryInfo,
} from './categories';
