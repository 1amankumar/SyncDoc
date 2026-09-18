import mongoose, {
    Document as MongoDocument,
    Schema
} from "mongoose";

export interface IUser extends MongoDocument {
    name: string;
    email: string;
    password?: string;
    googleId?:string;
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