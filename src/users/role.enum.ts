export enum Role {
    User = 'user',
    Admin = 'admin',
    SuperAdmin = 'superAdmin',
}

export enum RoleAction {
    Ban = 'ban',
}

export const RoleRules: { [key in Role]: { [key in RoleAction]: Role[] } } = {
    [Role.User]: {
        [RoleAction.Ban]: [],
    },
    [Role.Admin]: {
        [RoleAction.Ban]: [Role.User],
    },
    [Role.SuperAdmin]: {
        [RoleAction.Ban]: [Role.User, Role.Admin],
    },
}
