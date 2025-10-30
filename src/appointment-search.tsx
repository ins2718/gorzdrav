import React from "react";

type AppointmentSearchProps = {
    statusMessage: string;
    foundAppointment: AppointmentSlot | null;
    onCancel: () => void;
};

export const AppointmentSearch: React.FC<AppointmentSearchProps> = ({ statusMessage, foundAppointment, onCancel }) => {
    return (
        <div className="gz-profile-form">
            <h2>{foundAppointment ? "Талон найден!" : "Поиск талона"}</h2>
            <p>{statusMessage}</p>
            {foundAppointment && (
                <p>Время: {new Date(foundAppointment.visitStart).toLocaleString()}</p>
            )}
            <button type="button" onClick={onCancel}>Отмена</button>
        </div>
    );
};
