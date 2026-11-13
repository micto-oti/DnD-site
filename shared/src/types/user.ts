/**
 * Пользователь системы.
 * Соответствует записи в таблице `users`.
 */
export interface User
{
    id: string;
    email: string;
    nickname: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Полезная нагрузка JWT-токена.
 * Кодируется при логине, декодируется при каждом запросе.
 */
export interface JwtPayload
{
    sub: string;        // user id
    email: string;
    iat: number;        // issued at (unix timestamp)
    exp: number;        // expires at (unix timestamp)
}

/**
 * Payload для подписи JWT (без iat/exp — их добавляет библиотека).
 */
export interface JwtSignPayload
{
    sub: string;    // user id
    email: string;
}

/**
 * Ответ сервера при логине / регистрации.
 */
export interface LoginResponse
{
    user: User;
    token: string;
}

/**
 * Входные данные для логина.
 * Клиент отправляет только email — регистрация и вход объединены.
 */
export interface LoginInput
{
    email: string;
}

/**
 * Входные данные для обновления профиля.
 */
export interface UpdateUserInput
{
    nickname?: string;
}