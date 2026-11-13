interface ToolButtonProps
{
    icon: string;
    title: string;
    active: boolean;
    onClick: () => void;
    onMouseEnter: () => void;
}

function ToolButton({
    icon,
    title,
    active,
    onClick,
    onMouseEnter,
}: ToolButtonProps): React.JSX.Element
{
    return (
        <button
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            title={title}
            style={{
                ...styles.button,
                ...(active ? styles.buttonActive : {}),
            }}
        >
            {icon}
        </button>
    );
}

const styles = {
    button: {
        width: "36px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.125rem",
        color: "#e8e8e8",
        background: "transparent",
        borderRadius: "4px",
        cursor: "pointer",
        border: "none",
        transition: "background 0.15s",
    },
    buttonActive: {
        background: "#3a7bd5",
        color: "#fff",
    },
};

export default ToolButton;