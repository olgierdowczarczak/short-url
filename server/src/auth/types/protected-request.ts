import type { Request } from 'express';
import { AuthUser } from './auth-user.js';

export type ProtectedRequest = Request & { user?: AuthUser };
