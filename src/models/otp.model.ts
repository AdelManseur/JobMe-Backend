import { Schema, model, models, Document } from "mongoose";

export type OtpRecord = {
    hash: string;
    expires: number;
};

interface IOtp extends OtpRecord, Document {}

const otpSchema = new Schema<IOtp>({
    hash: {
        type: String,
        required: true
    },
    expires: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

const Otp = models.Otp || model<IOtp>("Otp", otpSchema);

export default Otp;
export { IOtp };