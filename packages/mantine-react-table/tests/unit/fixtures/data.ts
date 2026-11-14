import { type MRT_ColumnDef } from 'mantine-react-table-ng';

export type Person = {
  age: number;
  city: string;
  firstName: string;
  id: string;
  lastName: string;
};

export const people: Person[] = [
  { age: 31, city: 'Omaha', firstName: 'Ada', id: 'p1', lastName: 'Young' },
  { age: 45, city: 'Boise', firstName: 'Ben', id: 'p2', lastName: 'Xu' },
  { age: 27, city: 'Tulsa', firstName: 'Cy', id: 'p3', lastName: 'West' },
  { age: 52, city: 'Akron', firstName: 'Dee', id: 'p4', lastName: 'Vance' },
  { age: 38, city: 'Reno', firstName: 'Eli', id: 'p5', lastName: 'Underhill' },
];

export const columns: MRT_ColumnDef<Person>[] = [
  { accessorKey: 'firstName', header: 'First Name' },
  { accessorKey: 'lastName', header: 'Last Name' },
  { accessorKey: 'age', header: 'Age' },
  { accessorKey: 'city', header: 'City' },
];

export const manyPeople = (count: number): Person[] =>
  Array.from({ length: count }, (_, i) => ({
    age: 20 + (i % 50),
    city: `City ${i}`,
    firstName: `First${i}`,
    id: `m${i}`,
    lastName: `Last${i}`,
  }));
