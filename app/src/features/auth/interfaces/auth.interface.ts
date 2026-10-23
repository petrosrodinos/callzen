
export interface SignInUser {
    email: string;
    password: string;
}

export interface SignUpUser {
    email: string;
    password: string;
    full_name?: string;
    preferred_language?: string;
}

