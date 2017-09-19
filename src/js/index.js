import 'babel-polyfill';

import * as d3 from 'd3';
import  d3aster from './aster.js';
import styles from '../css/style.css';

/**
 * Created by ryshackleton on 5/15/17.
 */
var asterOptions = {
    width: 500, height: 500,
    showHeightLabels: true,
    showWidthLabels: true,
    showOuterArc: false,
    transitionMethod: "sweepSlice",
    innerRadius: 50,
    labelFontSizePercentageOfWidth: 0.35
};
var aster = new d3aster(asterOptions);
var lastSelectedData = null;

var body = d3.select("body");

body.append("h1")
    .text("Kaleidoscope Cannabis Logo/Terpene Pie Mockup");

body.append("h2")
    .text("Mouseover the name of a brand below to see the terpene content");

/* add radio buttons to toggle different transition types */
var transitionForm = body.append("form")
    .attr("class","transition-toggle-form");
transitionForm.append("label")
    .text("Transition Methods: ")
    .attr("class","transition-labels");

aster.transitionMethodsArray().forEach(function(d) {
    transitionForm.append("label")
        .text(d+" ")
        .attr("class","transition-labels")
        .append("input")
        .attr("type","radio")
        .attr("name","transition")
        .attr("value", d)
        .attr(d === asterOptions.transitionMethod
            ? "checked" 
            : "not-checked", "")
        .on('click', function() {
            aster.transitionMethod(d);
            d3.select("#aster-div")
                .datum(lastSelectedData)
                .call(aster);
        });
});

/* buttons to toggle sorting by height */
body.append("button")
    .text("Sort By Increasing Terpenes")
    .on('click', function() {
        if( d3.select(this).node().innerHTML === "Sort By Increasing Terpenes" ){
            // example of how to set a sort function example, sort by height ascending
            aster.pieSortFunc(function(a, b)
            {
                return +a.height_var > +b.height_var;
            });
            d3.select(this).text("Don't Sort Terpenes");
        }
        else
        {
            aster.pieSortFunc(null);
            d3.select(this).text("Sort By Increasing Terpenes");
        }
        d3.select("#aster-div")
            .datum(lastSelectedData)
            .call(aster);
    });

/* button to toggle different labels along the arcs */
body.append("button")
    .text("Label By Feeling")
    .on('click', function() {
        if( d3.select(this).node().innerHTML === "Label by Terpene" )
        {
            aster.arcLabelsTextFunc(function(d){ return d.data.label_arc_short; });
            d3.select(this).text("Label by Feeling");
        }
        else
        {
            aster.arcLabelsTextFunc(function(d){ return d.data.label_legend; });
            d3.select(this).text("Label by Terpene");
        }
        d3.select("#aster-div")
            .datum(lastSelectedData)
            .call(aster);
    });
/* div for the aster plot */
body.append("div")
    .attr("id","aster-div");

/* div for the brand labels */
var brandDiv = body.append("div")
    .attr("id","brand-labels-div");

// load the logo aster data with no labels, etc
d3.csv('data/kaleidoscope_logo_data.csv', function(error, data)
{
    lastSelectedData = data;
    d3.select("#aster-div")
        .datum(data)
        .call(aster);
});

// set up brand labels and mouseover to trigger their terpene asters
var brandData = {};
d3.csv('data/cannabis_data.csv', function(error, data)
{
    // group the data
    // deal with ancient browsers
    var allVals = Object.keys(data).map(function(key) {
        return data[key];
    });
    
    // sort data by brand
    brandData = allVals.reduce(function(grouped,d) {
        if( d.brand !== undefined )
        {
            if( grouped[d.brand] === undefined )
                grouped[d.brand] = [];
            grouped[d.brand].push(d);
        }
        return grouped;
    }, {} );

    Object.keys(brandData).forEach(function(d,i)
    {
        brandDiv
            .append("h3")
            .attr("class","cannabis-labels-text")
            .style("font-weight","normal")
            .attr("id","brand_id_"+i)
            .text(d)
            .on("mouseover", function(){
                d3.selectAll(".cannabis-labels-text")
                    .style("font-weight", "normal");
                
                lastSelectedData = brandData[d];
                
                d3.select("#brand_id_"+i)
                    .style("font-weight","bold");

                aster.showWidthLabels(true);
                aster.showHeightLabels(true);
                aster.showCenterLabel(true);
                aster.centerLabelText(d);
                aster.labelFontSizePercentageOfWidth(0.35);
                d3.select("#aster-div")
                    .datum(brandData[d])
                    .call(aster);
            })
            .on("mouseout", function()
            {
                // could un-bold on mouseout...
                // d3.select("#brand_id_" + i)
                //     .style("font-weight", "normal")
            });
    });
});

