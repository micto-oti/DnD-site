import { Layer } from "react-konva";

import type { Token as TokenType } from "@gm-table/shared";

import Token from "../Token.js";

interface TokenLayerProps
{
    tokens: TokenType[];
    scale: number;
    myUserId: string | null;
    isGm: boolean;
    onHover: (tokenId: string | null) => void;
    onMove: (tokenId: string, xPercent: number, yPercent: number) => void;
    onContextMenu: (tokenId: string, x: number, y: number) => void;
}

function TokenLayer({
    tokens,
    scale,
    myUserId,
    isGm,
    onHover,
    onMove,
    onContextMenu,
}: TokenLayerProps): React.JSX.Element
{
    return (
        <Layer>
            {tokens.map((token) => (
                <Token
                    key={token.id}
                    token={token}
                    scale={scale}
                    isOwn={myUserId !== null && token.ownerId === myUserId}
                    isGm={isGm}
                    onHover={onHover}
                    onMove={onMove}
                    onContextMenu={onContextMenu}
                />
            ))}
        </Layer>
    );
}

export default TokenLayer;