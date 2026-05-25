export interface UserContextInput {
    name?: string;
}

export function renderUserContextBlock(input: UserContextInput): string | null {
    const firstName = pickFirstName(input.name);
    if (!firstName) {
        return null;
    }

    return [
        `Nome do usuário: ${firstName}`,
        `Trate o usuário pelo primeiro nome (${firstName}) quando fizer sentido, sem repetir em toda mensagem.`,
    ].join('\n');
}

function pickFirstName(fullName?: string): string | undefined {
    if (!fullName) return undefined;
    const trimmed = fullName.trim();
    if (!trimmed) return undefined;
    return trimmed.split(/\s+/)[0];
}
