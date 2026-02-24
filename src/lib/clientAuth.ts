export async function refreshToken() {
    try {
        const res = await fetch('/api/auth/refresh', { 
            method: 'POST',
            credentials: 'include'
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const requestOptions = {
        ...options,
        credentials: 'include' as RequestCredentials
    };
    
    let res = await fetch(url, requestOptions);
    
    if (res.status === 401) {
        console.log('401 error, attempting refresh...');
        const refreshed = await refreshToken();
        if (refreshed) {
            console.log('Token refreshed, retrying request...');
            res = await fetch(url, requestOptions);
        } else {
            console.log('Refresh failed, redirecting to login');
        }
    }
    
    return res;
}