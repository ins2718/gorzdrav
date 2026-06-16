import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "./modal";
import { ProfileForm } from "./profile-form";
import { DateTimeForm } from "./date-time-form";
import { AppointmentSearch } from "./appointment-search";

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

async function getDoctorsBySpeciality(lpuId: string, specialityId: string): Promise<any[]> {
    const url = `https://gorzdrav.spb.ru/_api/api/v2/schedule/lpu/${lpuId}/speciality/${specialityId}/doctors`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Сетевая ошибка: ${response.statusText}`);
        }
        const data = await response.json();

        if (data.success && Array.isArray(data.result)) {
            return data.result;
        } else {
            console.error("Gorzdrav helper: Ошибка API при получении врачей", data.message);
            return [];
        }
    } catch (error) {
        console.error("Gorzdrav helper: Ошибка при получении врачей", error);
        return [];
    }
}

async function getAvailableAppointments(lpuId: string, doctorId: string): Promise<AppointmentSlot[]> {
    const url = `https://gorzdrav.spb.ru/_api/api/v2/schedule/lpu/${lpuId}/doctor/${doctorId}/appointments`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Сетевая ошибка: ${response.statusText}`);
        }
        const data = await response.json();

        if (data.success && Array.isArray(data.result)) {
            return data.result;
        } else {
            console.error("Gorzdrav helper: Ошибка API при получении талонов", data.message);
            return [];
        }
    } catch (error) {
        console.error("Gorzdrav helper: Ошибка при получении талонов", error);
        return [];
    }
}

async function bookAppointment(
    lpuId: string,
    profile: Profile,
    appointment: AppointmentSlot
): Promise<{ success: boolean; message?: string }> {
    const url = "https://gorzdrav.spb.ru/_api/api/v2/appointment/create";
    const toApiDate = (isoDate: string) => `${isoDate}T00:00:00`;

    const payload = {
        lpuId: lpuId,
        patientId: profile.id,
        appointmentId: appointment.id,
        recipientEmail: profile.email,
        patientLastName: profile.lastName,
        patientFirstName: profile.firstName,
        patientMiddleName: profile.middleName,
        patientBirthdate: toApiDate(profile.birthDate),
        room: appointment.room,
        num: appointment.number === null ? null : appointment.number.toString(),
        address: appointment.address,
        visitDate: appointment.visitStart,
        esiaId: null,
        referralId: null,
        ipmpiCardId: null,
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (data.success) {
            const successMessage = `Талон для ${profile.lastName} ${profile.firstName} на ${appointment.visitStart} в кабинет ${appointment.room} успешно забронирован!`;
            return { success: true, message: data.message || successMessage };
        }
        return { success: false, message: data.message || "Неизвестная ошибка бронирования." };
    } catch (error) {
        console.error("Gorzdrav helper: Ошибка при бронировании талона", error);
        return { success: false, message: "Сетевая ошибка при бронировании." };
    }
}

export const App: React.FC<{ lpuId: string }> = ({ lpuId }) => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isListModalOpen, setListModalOpen] = useState(false);
    const [isFormModalOpen, setFormModalOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
    const [isDateTimeModalOpen, setDateTimeModalOpen] = useState(false);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [foundAppointment, setFoundAppointment] = useState<AppointmentSlot | null>(null);
    const [searchStatusMessage, setSearchStatusMessage] = useState("");
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [selectedSpecialityId, setSelectedSpecialityId] = useState<string | null>(null);

    const searchIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

    const loadProfiles = useCallback(async () => {
        const allProfiles = await getProfiles();
        setProfiles(allProfiles.filter(p => p.lpu === lpuId));
    }, [lpuId]);

    const handleOpenDateTimeModal = useCallback((event: Event) => {
        const customEvent = event as CustomEvent;
        const { doctorId, specialityId } = customEvent.detail;
        if (doctorId) {
            setSelectedDoctorId(doctorId);
            setSelectedSpecialityId(null);
            setIsSearching(false);
            setFoundAppointment(null);
            if (profiles.length > 0) setSelectedProfileId(profiles[0].id);
            setDateTimeModalOpen(true);
        } else if (specialityId) {
            setSelectedDoctorId(null);
            setSelectedSpecialityId(specialityId);
            setIsSearching(false);
            setFoundAppointment(null);
            if (profiles.length > 0) setSelectedProfileId(profiles[0].id);
            setDateTimeModalOpen(true);
        }
    }, []);

    useEffect(() => {
        document.addEventListener("openDateTimeModal", handleOpenDateTimeModal);
        return () => {
            document.removeEventListener("openDateTimeModal", handleOpenDateTimeModal);
        };
    }, [handleOpenDateTimeModal]);


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

    const stopSearch = useCallback(() => {
        if (searchIntervalRef.current) {
            clearInterval(searchIntervalRef.current);
            searchIntervalRef.current = null;
        }
        setIsSearching(false);
    }, []);

    const handleCancelSearch = () => {
        stopSearch();
        setSearchStatusMessage("");
        setDateTimeModalOpen(false);
    };

    const handleDateTimeConfirm = (data: { date: string; time: string; profileId: string }) => {
        if ((!selectedDoctorId && !selectedSpecialityId) || !data.profileId) return;

        const selectedProfile = profiles.find(p => p.id === data.profileId);
        if (!selectedProfile) {
            alert("Выбранный профиль не найден.");
            return;
        }
        setSelectedProfileId(data.profileId);

        setIsSearching(true);
        setSearchStatusMessage("Идет поиск доступных талонов...");

        const requestedDateTime = new Date(`${data.date}T${data.time}`);

        const intervalInSec = 10;

        const search = async () => {
            console.log("Выполняется поиск талонов...");
            let suitableAppointment: AppointmentSlot | undefined;

            if (selectedDoctorId) {
                const appointments = await getAvailableAppointments(lpuId, selectedDoctorId);
                suitableAppointment = appointments
                    .filter(slot => new Date(slot.visitStart) >= requestedDateTime)
                    .sort((a, b) => new Date(a.visitStart).getTime() - new Date(b.visitStart).getTime())[0];
            } else if (selectedSpecialityId) {
                const doctors = await getDoctorsBySpeciality(lpuId, selectedSpecialityId);
                for (const doctor of doctors) {
                    const appointments = await getAvailableAppointments(lpuId, doctor.id);
                    const found = appointments
                        .filter(slot => new Date(slot.visitStart) >= requestedDateTime)
                        .sort((a, b) => new Date(a.visitStart).getTime() - new Date(b.visitStart).getTime())[0];
                    if (found) {
                        suitableAppointment = found;
                        break;
                    }
                }
            }

            if (suitableAppointment) {
                stopSearch();
                setFoundAppointment(suitableAppointment);
                setSearchStatusMessage(`Найден талон! Бронируем на ${selectedProfile.lastName}...`);
                const bookingResult = await bookAppointment(lpuId, selectedProfile, suitableAppointment);
                setSearchStatusMessage(bookingResult.message || "Статус бронирования неизвестен.");
            } else {
                setSearchStatusMessage(`Свободных талонов нет. Следующая попытка через ${intervalInSec} секунд...`);
            }
        };

        search(); // Первый запуск
        searchIntervalRef.current = setInterval(search, intervalInSec * 1000); // Повторять каждые 30 секунд
    };

    useEffect(() => {
        // Очистка интервала при размонтировании компонента
        return () => {
            stopSearch();
        };
    }, [stopSearch]);

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

            <Modal id="gz-datetime-modal" show={isDateTimeModalOpen} onClose={handleCancelSearch}>
                {isSearching || searchStatusMessage ? (
                    <AppointmentSearch
                        statusMessage={searchStatusMessage}
                        foundAppointment={foundAppointment}
                        onCancel={handleCancelSearch}
                    />
                ) : (
                    <DateTimeForm
                        onConfirm={handleDateTimeConfirm}
                        profiles={profiles}
                        selectedProfileId={selectedProfileId}
                        onCancel={handleCancelSearch}
                    />
                )}
            </Modal>
        </>
    );
};
