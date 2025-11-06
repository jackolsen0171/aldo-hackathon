import React from 'react';
import CategorySection from './CategorySection';
import { mockClothingCategories } from '../data/mockData';
import './ClothingCategories.css';

const ClothingCategories = ({
    selectedItems = {},
    onItemSelect = () => { }
}) => {
    return (
        <div className="clothing-categories">
            <div className="categories-container">
                {mockClothingCategories.map((category) => (
                    <CategorySection
                        key={category.id}
                        category={category}
                        items={category.items}
                        selectedItem={selectedItems[category.name]}
                        onItemSelect={(item) => onItemSelect(category.name, item)}
                    />
                ))}
            </div>
        </div>
    );
};

export default ClothingCategories;