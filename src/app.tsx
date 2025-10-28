import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "./modal";
import { ProfileForm } from "./profile-form";

const PROFILES_KEY = "gorzdrav_profiles";

// Функции для работы с API и хранилищем, перенесены из content-script
async function getProfiles(): Promise<Profile[]> {
    const result = await chrome.storage.local.get(PROFILES_KEY);
    return result[PROFILES_KEY] || [];
}

async function saveProfiles(profiles: Profile[]): Promise<void> {
    await chrome.storage.local.set({ [PROFILES_KEY]: profiles });
}

async function validateProfileWithApi(profileData: Omit<Profile, "id">): Promise<{ success: boolean; message?: string; id?: string }> {
    const toApiDate = (isoDate: string) => `${isoDate}T00:00:00`;
    const toApiDateValue = (isoDate: string) => {
        const [year, month, day] = isoDate.split("-");
        return `${day}.${month}.${year}`;
    };

    const params = new URLSearchParams({
        lpuId: profileData.lpu,
        lastName: profileData.lastName,
        firstName: profileData.firstName,
        middleName: profileData.middleName,
        birthdate: toApiDate(profileData.birthDate),
        birthdateValue: toApiDateValue(profileData.birthDate),
    });

    const url = `https://gorzdrav.spb.ru/_api/api/v2/patient/search?${params.toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Ошибка сети: ${response.statusText}`);
        }
        const data = await response.json();

        if (data.success === true) {
            const patientId = data.result;
            return { success: true, id: patientId };
        } else {
            return { success: false, message: data.message || "Неизвестная ошибка валидации." };
        }
    } catch (error) {
        console.error("Gorzdrav helper: API validation error", error);
        return { success: false, message: "Не удалось проверить анкету. Проверьте подключение к интернету или попробуйте позже." };
    }
}


export const App: React.FC<{ lpuId: string }> = ({ lpuId }) => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isListModalOpen, setListModalOpen] = useState(false);
    const [isFormModalOpen, setFormModalOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

    const loadProfiles = useCallback(async () => {
        const allProfiles = await getProfiles();
        setProfiles(allProfiles.filter(p => p.lpu === lpuId));
    }, [lpuId]);

    useEffect(() => {
        loadProfiles();
    }, [loadProfiles]);

    const handleAddNew = () => {
        setEditingProfile(null);
        setFormModalOpen(true);
    };

    const handleEdit = (profile: Profile) => {
        setEditingProfile(profile);
        setFormModalOpen(true);
    };

    const handleDelete = async (profileId: string) => {
        if (confirm("Вы уверены, что хотите удалить эту анкету?")) {
            const allProfiles = await getProfiles();
            const updatedProfiles = allProfiles.filter(p => p.id !== profileId);
            await saveProfiles(updatedProfiles);
            loadProfiles();
        }
    };

    const handleSave = async (profileData: Omit<Profile, "id" | "lpu"> | Profile) => {
        const allProfiles = await getProfiles();
        const profileWithLpu = { ...profileData, lpu: lpuId };

        const validationResult = await validateProfileWithApi(profileWithLpu);
        if (!validationResult.success) {
            alert(`Ошибка: ${validationResult.message}`);
            return;
        }

        if ("id" in profileData && profileData.id) {
            // Update
            // Используем ID от API, если он есть, иначе оставляем старый
            const newId = validationResult.id || profileData.id;
            const updatedProfile: Profile = { ...(profileData as Profile), id: newId, lpu: lpuId };

            const updatedProfiles = allProfiles.map(p => p.id === profileData.id ? updatedProfile : p);
            await saveProfiles(updatedProfiles);
        } else {
            // Add
            // Используем ID от API, если он есть, иначе генерируем локально как раньше
            const id = validationResult.id || Date.now().toString();
            const newProfile: Profile = { ...profileData, id: id, lpu: lpuId };
            allProfiles.push(newProfile);
            await saveProfiles(allProfiles);
        }

        setFormModalOpen(false);
        loadProfiles();
    };

    return (
        <>
            <button
                id="gz-manager-btn"
                className="gz-profile-btn"
                onClick={() => setListModalOpen(true)}
            >
                Управление анкетами
            </button>

            <Modal id="gz-list-modal" show={isListModalOpen} onClose={() => setListModalOpen(false)}>
                <h2>Анкеты</h2>
                <div id="gz-profile-list">
                    {profiles.length === 0 ? (
                        <p>У вас пока нет сохраненных анкет для этого ЛПУ.</p>
                    ) : (
                        profiles.map(profile => (
                            <div key={profile.id} className="gz-profile-list-item">
                                <span>{profile.lastName} {profile.firstName}</span>
                                <div>
                                    <button onClick={() => handleEdit(profile)}>✏️</button>
                                    <button onClick={() => handleDelete(profile.id)}>🗑️</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <hr />
                <button onClick={handleAddNew}>Добавить анкету</button>
                <button onClick={() => setListModalOpen(false)}>Закрыть</button>
            </Modal>

            <Modal id="gz-form-modal" show={isFormModalOpen} onClose={() => setFormModalOpen(false)}>
                <ProfileForm
                    profile={editingProfile}
                    onSave={handleSave}
                    onCancel={() => setFormModalOpen(false)}
                />
            </Modal>
        </>
    );
};
