type Profile = {
    id: string;
    lpu: string;
    lastName: string;
    firstName: string;
    middleName: string;
    birthDate: string;
    email: string;
    phone: string;
};

interface AppointmentSlot {
    id: string;
    visitStart: string;
    visitEnd: string;
    address: string;
    number: number;
    room: string;
}
