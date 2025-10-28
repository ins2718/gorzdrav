import React, { useState, useEffect } from "react";

type ProfileFormProps = {
    profile?: Profile | null;
    onSave: (profile: Omit<Profile, "id" | "lpu"> | Profile) => void;
    onCancel: () => void;
};

const initialProfileState: Omit<Profile, "id" | "lpu"> = {
    lastName: "",
    firstName: "",
    middleName: "",
    birthDate: "",
    email: "",
    phone: "",
};

export const ProfileForm: React.FC<ProfileFormProps> = ({ profile, onSave, onCancel }) => {
    const [formData, setFormData] = useState(profile || initialProfileState);

    useEffect(() => {
        setFormData(profile || initialProfileState);
    }, [profile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form id="gz-profile-form" className="gz-profile-form" onSubmit={handleSubmit}>
            <h2 id="gz-form-title">{profile ? "Редактировать анкету" : "Добавить анкету"}</h2>
            {profile?.id && <input type="text" name="id" value={profile.id} readOnly disabled title="ID пациента" />}
            <input type="text" name="lastName" placeholder="Фамилия" required value={formData.lastName} onChange={handleChange} />
            <input type="text" name="firstName" placeholder="Имя" required value={formData.firstName} onChange={handleChange} />
            <input type="text" name="middleName" placeholder="Отчество" required value={formData.middleName} onChange={handleChange} />
            <input type="date" name="birthDate" placeholder="Дата рождения" required value={formData.birthDate} onChange={handleChange} />
            <input type="email" name="email" placeholder="Электронная почта" required value={formData.email} onChange={handleChange} />
            <input type="tel" name="phone" placeholder="Телефон" required value={formData.phone} onChange={handleChange} />
            <div className="gz-form-buttons">
                <button type="submit">Сохранить</button>
                <button type="button" onClick={onCancel}>Отмена</button>
            </div>
        </form>
    );
};
