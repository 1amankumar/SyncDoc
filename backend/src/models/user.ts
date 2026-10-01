import mongoose, {
    Document as MongoDocument,
    Schema
} from "mongoose";

export interface IUser extends MongoDocument {
    name: string;
    email: string;
    password?: string;
    googleId?: string;
    authProvider?: "local" | "google";
}

const userSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            minlength: 6
        },

        googleId: {
            type: String,
            unique: true,
            sparse: true
        },

        authProvider: {
            type: String,
            enum: ["local", "google"],
            default: "local"
        }
    },
    {
        timestamps: true
    }
);

const UserModel = mongoose.model<IUser>(
    "User",
    userSchema
);

export default UserModel;