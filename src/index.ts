import { Plugin } from '@elizaos/core';
import { AdminService } from './services/admin';

import { elevatePrivilegeAction } from './actions/elevatePrivilege';
import { globalReportAction } from './actions/globalReport';
import { listAllUsersAction } from './actions/listAllUsers';
import { listAllRoomsAction } from './actions/listAllRooms';
import { searchMessagesAction } from './actions/searchMessages';
import { userAuditAction } from './actions/userAudit';

import { globalContextProvider } from './providers/globalContext';

export const adminPlugin: Plugin = {
  name: '@elizaos/plugin-admin',
  description:
    'Provides privileged administrative actions and global context providers once unlocked via an admin password.',
  services: [AdminService],
  actions: [
    elevatePrivilegeAction, 
    globalReportAction, 
    listAllUsersAction, 
    listAllRoomsAction,
    searchMessagesAction,
    userAuditAction
  ],
  providers: [globalContextProvider],
};

export { AdminService } from './services/admin'; 