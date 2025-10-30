import React, { useState, useEffect } from "react";

type DateTimeFormProps = {
    onConfirm: (data: { date: string; time: string; profileId: string }) => void;
    onCancel: () => void;
    statusMessage?: string;
    profiles: Profile[];
    selectedProfileId: string | null;
};

export const DateTimeForm: React.FC<DateTimeFormProps> = ({ onConfirm, onCancel, statusMessage, profiles, selectedProfileId: initialProfileId }) => {
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [selectedProfileId, setSelectedProfileId] = useState(initialProfileId || (profiles.length > 0 ? profiles[0].id : ""));

    useEffect(() => {
        if (initialProfileId) {
            setSelectedProfileId(initialProfileId);
        }
    }, [initialProfileId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (date && time && selectedProfileId) {
            onConfirm({ date, time, profileId: selectedProfileId });
        } else if (!selectedProfileId) {
            alert("Пожалуйста, выберите анкету для записи.");
        } else {
            alert("Пожалуйста, выберите дату и время.");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="gz-profile-form">
            <h2>Выберите дату и время</h2>
            <select value={selectedProfileId} onChange={(e) => setSelectedProfileId(e.target.value)} required>
                {profiles.length === 0 ? (
                    <option value="" disabled>Сначала добавьте анкету</option>
                ) : (
                    profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.lastName} {p.firstName}</option>
                    ))
                )}
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            {statusMessage && <p>{statusMessage}</p>}
            <div className="gz-form-buttons">
                <button type="submit">Подтвердить</button>
                <button type="button" onClick={onCancel}>
                    Отмена
                </button>
            </div>
        </form>
    );
};
