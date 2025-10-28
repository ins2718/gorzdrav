import React from "react";

type ModalProps = {
    id: string;
    show: boolean;
    onClose: () => void;
    children: React.ReactNode;
};

export const Modal: React.FC<ModalProps> = ({ id, show, onClose, children }) => {
    if (!show) {
        return null;
    }

    return (
        <div id={id} className="gz-modal-backdrop" onClick={onClose}>
            <div className="gz-modal-content" onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
};
